package com.inspectra.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.inspectra.ai.FailureAnalysisService;
import com.inspectra.model.*;
import com.inspectra.repository.*;
import com.inspectra.security.TargetUrlSecurityValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
public class TestRunService {
    private static final Logger log = LoggerFactory.getLogger(TestRunService.class);

    private final TestRunRepository testRunRepository;
    private final ProjectRepository projectRepository;
    private final DiscoveredPageRepository discoveredPageRepository;
    private final TestResultRepository testResultRepository;
    private final FindingRepository findingRepository;
    private final TestArtifactRepository testArtifactRepository;
    private final ExecutionEventRepository executionEventRepository;

    private final TargetUrlSecurityValidator urlValidator;
    private final SseBroadcaster sseBroadcaster;
    private final QualityScoreCalculator qualityScoreCalculator;
    private final FailureAnalysisService failureAnalysisService;
    private final ObjectMapper objectMapper;
    private final WebClient webClient;

    @Value("${inspectra.worker.base-url:http://localhost:5001}")
    private String workerBaseUrl;

    public TestRunService(
            TestRunRepository testRunRepository,
            ProjectRepository projectRepository,
            DiscoveredPageRepository discoveredPageRepository,
            TestResultRepository testResultRepository,
            FindingRepository findingRepository,
            TestArtifactRepository testArtifactRepository,
            ExecutionEventRepository executionEventRepository,
            TargetUrlSecurityValidator urlValidator,
            SseBroadcaster sseBroadcaster,
            QualityScoreCalculator qualityScoreCalculator,
            FailureAnalysisService failureAnalysisService,
            ObjectMapper objectMapper
    ) {
        this.testRunRepository = testRunRepository;
        this.projectRepository = projectRepository;
        this.discoveredPageRepository = discoveredPageRepository;
        this.testResultRepository = testResultRepository;
        this.findingRepository = findingRepository;
        this.testArtifactRepository = testArtifactRepository;
        this.executionEventRepository = executionEventRepository;
        this.urlValidator = urlValidator;
        this.sseBroadcaster = sseBroadcaster;
        this.qualityScoreCalculator = qualityScoreCalculator;
        this.failureAnalysisService = failureAnalysisService;
        this.objectMapper = objectMapper;
        this.webClient = WebClient.builder().build();
    }

    public record RunRequest(
            String targetUrl,
            List<String> categories,
            List<Map<String, Object>> viewports,
            Integer maxPages,
            Boolean allowPrivateIps
    ) {}

    public TestRun initiateRun(String projectId, String userId, RunRequest req) {
        return initiateRun(projectId, userId, req, "MANUAL");
    }

    public TestRun initiateRun(String projectId, String userId, RunRequest req, String triggerSource) {
        Project project = projectRepository.findByIdAndOwnerId(projectId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found or unauthorized."));

        String targetUrl = req.targetUrl() != null && !req.targetUrl().isBlank()
                ? req.targetUrl().trim()
                : project.getTargetUrl();

        boolean allowPrivate = req.allowPrivateIps() != null ? req.allowPrivateIps() : true; // allow dev test fixture
        TargetUrlSecurityValidator.ValidationResult secCheck = urlValidator.validate(targetUrl, allowPrivate);
        if (!secCheck.safe()) {
            throw new IllegalArgumentException("Target URL rejected: " + secCheck.reason());
        }

        String runId = "run-" + UUID.randomUUID().toString().substring(0, 12);
        TestRun run = new TestRun(runId, projectId, userId, secCheck.normalizedUrl());
        run.setStatus("QUEUED");
        run.setTriggerSource(triggerSource != null ? triggerSource : "MANUAL");
        run.setStartedAt(Instant.now());
        testRunRepository.save(run);

        // Record initial event
        String triggerMsg = "SCHEDULED".equalsIgnoreCase(triggerSource)
                ? "Autonomous scheduled audit triggered and queued for execution."
                : "Job registered and queued for execution.";
        recordEvent(runId, "STATE_CHANGE", "QUEUED", triggerMsg, null);

        // Asynchronously trigger execution on browser worker
        triggerWorkerExecution(run, req);

        return run;
    }

    @Async
    public void triggerWorkerExecution(TestRun run, RunRequest req) {
        String runId = run.getId();

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("runId", runId);
            payload.put("projectId", run.getProjectId());
            payload.put("targetUrl", run.getTargetUrl());
            payload.put("categories", req.categories() != null && !req.categories().isEmpty()
                    ? req.categories()
                    : List.of("functional", "navigation", "forms", "responsive", "accessibility", "seo", "console", "network"));
            payload.put("viewports", req.viewports() != null ? req.viewports() : List.of(
                    Map.of("name", "Desktop (1440x900)", "width", 1440, "height", 900),
                    Map.of("name", "Mobile (390x844)", "width", 390, "height", 844)
            ));
            payload.put("maxPages", req.maxPages() != null ? req.maxPages() : 6);
            payload.put("maxExecutionTimeMs", 60000);
            payload.put("allowPrivateIps", req.allowPrivateIps() != null ? req.allowPrivateIps() : true);

            // POST to worker execute
            webClient.post()
                    .uri(workerBaseUrl + "/api/worker/execute")
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .timeout(Duration.ofSeconds(10))
                    .block();

            // Connect to worker SSE stream to receive live events in real-time
            listenToWorkerEvents(runId);

        } catch (Exception e) {
            log.error("Failed to dispatch run {} to worker: {}", runId, e.getMessage());
            run.setStatus("FAILED");
            run.setCompletedAt(Instant.now());
            testRunRepository.save(run);

            recordEvent(runId, "STATE_CHANGE", "FAILED", "Worker dispatch failed: " + e.getMessage(), null);
        }
    }

    private void listenToWorkerEvents(String runId) {
        try {
            webClient.get()
                    .uri(workerBaseUrl + "/api/worker/runs/" + runId + "/events")
                    .retrieve()
                    .bodyToFlux(String.class)
                    .takeUntil(eventStr -> {
                        try {
                            JsonNode ev = objectMapper.readTree(eventStr);
                            String type = ev.path("type").asText("");
                            String step = ev.path("step").asText("");
                            return "COMPLETE".equals(type) || "COMPLETED".equals(step) || "FAILED".equals(step) || "CANCELLED".equals(step);
                        } catch (Exception e) {
                            return false;
                        }
                    })
                    .doOnNext(eventStr -> processWorkerEvent(runId, eventStr))
                    .doOnError(err -> log.warn("Worker SSE stream closed for run {}: {}", runId, err.getMessage()))
                    .blockLast(Duration.ofMinutes(5));
        } catch (Exception e) {
            log.info("SSE event stream completed for run {}: {}", runId, e.getMessage());
        } finally {
            finalizeRunResults(runId);
        }
    }


    private void processWorkerEvent(String runId, String eventStr) {
        try {
            JsonNode ev = objectMapper.readTree(eventStr);
            String type = ev.path("type").asText("LOG");
            String step = ev.path("step").asText("RUNNING");
            String message = ev.path("message").asText("");
            JsonNode details = ev.path("details");

            // Update run status if state change
            if ("STATE_CHANGE".equals(type)) {
                testRunRepository.findById(runId).ifPresent(r -> {
                    r.setStatus(step);
                    testRunRepository.save(r);
                });
            }

            recordEvent(runId, type, step, message, details != null ? details.toString() : null);
        } catch (Exception e) {
            log.debug("Event parse ignored: {}", e.getMessage());
        }
    }

    private synchronized void finalizeRunResults(String runId) {
        Optional<TestRun> runOpt = testRunRepository.findById(runId);
        if (runOpt.isEmpty()) return;
        TestRun run = runOpt.get();

        if ("COMPLETED".equals(run.getStatus()) && run.getCompletedAt() != null) {
            return; // Already finalized
        }

        try {
            JsonNode statusResp = null;
            // Retry fetch up to 3 times in case of micro-delays in report emission
            for (int retry = 0; retry < 3; retry++) {
                try {
                    statusResp = webClient.get()
                            .uri(workerBaseUrl + "/api/worker/runs/" + runId + "/status")
                            .retrieve()
                            .bodyToMono(JsonNode.class)
                            .timeout(Duration.ofSeconds(10))
                            .block();

                    if (statusResp != null && statusResp.has("report")) {
                        break;
                    }
                } catch (Exception ignored) {}
                Thread.sleep(400);
            }

            if (statusResp != null && statusResp.has("report")) {
                JsonNode report = statusResp.get("report");

                // Save Discovered Pages
                if (report.has("pagesDiscovered")) {
                    for (JsonNode p : report.get("pagesDiscovered")) {
                        DiscoveredPage dp = new DiscoveredPage(
                                "pg-" + UUID.randomUUID().toString().substring(0, 10),
                                runId,
                                p.path("url").asText(""),
                                p.path("title").asText(""),
                                p.path("discoveryStatus").asText("crawled")
                        );
                        discoveredPageRepository.save(dp);
                    }
                }

                // Save Test Results
                List<TestResult> savedResults = new ArrayList<>();
                if (report.has("results")) {
                    for (JsonNode r : report.get("results")) {
                        TestResult tr = new TestResult(
                                r.path("id").asText("res-" + UUID.randomUUID().toString().substring(0, 8)),
                                runId,
                                r.path("name").asText("Unnamed Test"),
                                r.path("category").asText("functional"),
                                r.path("url").asText(run.getTargetUrl()),
                                r.path("status").asText("passed"),
                                r.path("durationMs").asLong(0),
                                r.path("expectedOutcome").asText(""),
                                r.path("actualOutcome").asText(""),
                                r.has("errorSummary") ? r.get("errorSummary").asText() : null
                        );
                        savedResults.add(testResultRepository.save(tr));
                    }
                }

                // Save Findings
                List<Finding> savedFindings = new ArrayList<>();
                if (report.has("findings")) {
                    for (JsonNode f : report.get("findings")) {
                        Finding finding = new Finding();
                        finding.setId(f.path("id").asText("fnd-" + UUID.randomUUID().toString().substring(0, 8)));
                        finding.setTestRunId(runId);
                        finding.setTitle(f.path("title").asText("Issue"));
                        finding.setCategory(f.path("category").asText("functional"));
                        finding.setSeverity(f.path("severity").asText("medium"));
                        finding.setAffectedUrl(f.path("affectedUrl").asText(run.getTargetUrl()));
                        finding.setDescription(f.path("description").asText(""));
                        finding.setExpectedResult(f.path("expectedResult").asText(""));
                        finding.setActualResult(f.path("actualResult").asText(""));
                        finding.setSuggestedFix(f.path("suggestedFix").asText(""));
                        finding.setConfidence(f.path("confidence").asDouble(1.0));
                        finding.setVerificationStatus(f.path("verificationStatus").asText("verified"));
                        if (f.has("detectionMethod")) {
                            finding.setDetectionMethod(f.get("detectionMethod").asText());
                        }
                        if (f.has("technicalExplanation")) {
                            finding.setTechnicalExplanation(f.get("technicalExplanation").asText());
                        }
                        if (f.has("verificationProcedure")) {
                            finding.setVerificationProcedure(f.get("verificationProcedure").asText());
                        }
                        if (f.has("remediationStatus")) {
                            finding.setRemediationStatus(f.get("remediationStatus").asText("OPEN"));
                        }
                        if (f.has("reproductionSteps")) {
                            finding.setReproductionStepsJson(f.get("reproductionSteps").toString());
                        }
                        if (f.has("evidence")) {
                            finding.setEvidenceJson(f.get("evidence").toString());
                        }
                        savedFindings.add(finding);
                    }
                }

                // Save Artifacts
                if (report.has("artifacts")) {
                    for (JsonNode a : report.get("artifacts")) {
                        TestArtifact art = new TestArtifact(
                                "art-" + UUID.randomUUID().toString().substring(0, 10),
                                runId,
                                null,
                                a.path("type").asText("screenshot"),
                                a.path("name").asText("Artifact"),
                                a.path("path").asText("")
                        );
                        testArtifactRepository.save(art);
                    }
                }

                // AI Defect Root Cause Enrichment
                failureAnalysisService.enrichFindingsWithAnalysis(savedFindings);
                findingRepository.saveAll(savedFindings);

                // Compute Transparent Quality Score
                QualityScoreCalculator.CalculatedQualityMetrics metrics = qualityScoreCalculator.calculate(savedResults, savedFindings);

                run.setStatus("COMPLETED");
                run.setCompletedAt(Instant.now());
                run.setOverallScore(metrics.overallScore());
                run.setMetricsJson(metrics.metricsJson());
                if (run.getStartedAt() != null) {
                    run.setDurationMs(Duration.between(run.getStartedAt(), run.getCompletedAt()).toMillis());
                }
                testRunRepository.save(run);

                recordEvent(runId, "STATE_CHANGE", "COMPLETED", "Test run completed with score " + metrics.overallScore() + "/100.", metrics.metricsJson());
            }
        } catch (Exception e) {
            log.error("Failed to finalize results for run {}: {}", runId, e.getMessage());
        }
    }

    public void cancelRun(String runId) {
        testRunRepository.findById(runId).ifPresent(run -> {
            try {
                webClient.post()
                        .uri(workerBaseUrl + "/api/worker/cancel")
                        .bodyValue(Map.of("runId", runId))
                        .retrieve()
                        .bodyToMono(Void.class)
                        .block(Duration.ofSeconds(5));
            } catch (Exception ignored) {}

            run.setStatus("CANCELLED");
            run.setCompletedAt(Instant.now());
            testRunRepository.save(run);

            recordEvent(runId, "STATE_CHANGE", "CANCELLED", "User requested cancellation.", null);
        });
    }

    private void recordEvent(String runId, String type, String step, String message, String payloadJson) {
        int seq = executionEventRepository.countByTestRunId(runId) + 1;
        String evId = "ev-" + UUID.randomUUID().toString().substring(0, 10);
        ExecutionEvent ev = new ExecutionEvent(evId, runId, seq, type, step, message, payloadJson);
        executionEventRepository.save(ev);

        // Broadcast over SSE
        sseBroadcaster.broadcast(runId, Map.of(
                "id", evId,
                "runId", runId,
                "sequenceNumber", seq,
                "type", type,
                "step", step,
                "message", message,
                "payload", payloadJson != null ? payloadJson : "{}",
                "timestamp", Instant.now().toString()
        ));
    }
}
