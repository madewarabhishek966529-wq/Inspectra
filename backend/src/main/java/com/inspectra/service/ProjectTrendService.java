package com.inspectra.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.inspectra.model.Project;
import com.inspectra.model.TestRun;
import com.inspectra.repository.ProjectRepository;
import com.inspectra.repository.TestRunRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
public class ProjectTrendService {

    private final ProjectRepository projectRepository;
    private final TestRunRepository testRunRepository;
    private final ObjectMapper objectMapper;

    public ProjectTrendService(
            ProjectRepository projectRepository,
            TestRunRepository testRunRepository,
            ObjectMapper objectMapper
    ) {
        this.projectRepository = projectRepository;
        this.testRunRepository = testRunRepository;
        this.objectMapper = objectMapper;
    }

    public record TrendDataPoint(
            String runId,
            Instant timestamp,
            String triggerSource,
            Integer overallScore,
            Integer functionalScore,
            Integer responsiveScore,
            Integer accessibilityScore,
            Integer seoScore,
            Integer visualScore,
            Integer criticalFindings,
            Integer highFindings,
            Integer mediumFindings,
            Integer lowFindings,
            Long durationMs
    ) {}

    public record ProjectTrendsDto(
            String projectId,
            String projectName,
            String targetUrl,
            int totalRuns,
            int completedRuns,
            Double averageScore,
            Integer latestScore,
            Integer previousScore,
            Integer scoreDelta,
            String trendStatus, // IMPROVING, DEGRADING, STABLE
            String healthGrade,
            Boolean scheduleEnabled,
            String scheduleFrequency,
            String scheduleCron,
            Instant nextRunAt,
            Instant lastScheduledRunAt,
            List<TrendDataPoint> history
    ) {}

    public ProjectTrendsDto getProjectTrends(String projectId, String userId) {
        Project project = projectRepository.findByIdAndOwnerId(projectId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found or unauthorized."));

        List<TestRun> runs = testRunRepository.findByProjectIdOrderByCreatedAtDesc(projectId);

        List<TestRun> completedWithScore = runs.stream()
                .filter(r -> "COMPLETED".equalsIgnoreCase(r.getStatus()) && r.getOverallScore() != null)
                .toList();

        int totalRuns = runs.size();
        int completedCount = completedWithScore.size();

        Double avgScore = null;
        Integer latestScore = null;
        Integer prevScore = null;
        Integer scoreDelta = null;
        String trendStatus = "STABLE";
        String grade = "N/A";

        if (!completedWithScore.isEmpty()) {
            latestScore = completedWithScore.get(0).getOverallScore();
            avgScore = completedWithScore.stream()
                    .mapToInt(TestRun::getOverallScore)
                    .average()
                    .orElse(0.0);
            avgScore = Math.round(avgScore * 10.0) / 10.0;

            if (completedWithScore.size() > 1) {
                prevScore = completedWithScore.get(1).getOverallScore();
                scoreDelta = latestScore - prevScore;
                if (scoreDelta > 0) trendStatus = "IMPROVING";
                else if (scoreDelta < 0) trendStatus = "DEGRADING";
                else trendStatus = "STABLE";
            } else {
                scoreDelta = 0;
            }

            if (latestScore >= 90) grade = "A";
            else if (latestScore >= 80) grade = "B";
            else if (latestScore >= 70) grade = "C";
            else if (latestScore >= 60) grade = "D";
            else grade = "F";
        }

        // Construct chronological timeline points (limit to latest 30 runs for performance, sorted ascending)
        List<TestRun> forChart = new ArrayList<>(completedWithScore);
        if (forChart.size() > 30) {
            forChart = forChart.subList(0, 30);
        }
        Collections.reverse(forChart); // Oldest first for chart plotting

        List<TrendDataPoint> history = new ArrayList<>();
        for (TestRun r : forChart) {
            Integer fnScore = null;
            Integer respScore = null;
            Integer a11yScore = null;
            Integer seoScore = null;
            Integer visScore = null;
            int crit = 0, high = 0, med = 0, low = 0;

            if (r.getMetricsJson() != null && !r.getMetricsJson().isBlank()) {
                try {
                    JsonNode node = objectMapper.readTree(r.getMetricsJson());
                    if (node.has("functionalScore")) fnScore = node.get("functionalScore").asInt();
                    if (node.has("responsiveScore")) respScore = node.get("responsiveScore").asInt();
                    if (node.has("accessibilityScore")) a11yScore = node.get("accessibilityScore").asInt();
                    if (node.has("seoScore")) seoScore = node.get("seoScore").asInt();
                    if (node.has("visualScore")) visScore = node.get("visualScore").asInt();

                    if (node.has("criticalFindings")) crit = node.get("criticalFindings").asInt();
                    if (node.has("highFindings")) high = node.get("highFindings").asInt();
                    if (node.has("mediumFindings")) med = node.get("mediumFindings").asInt();
                    if (node.has("lowFindings")) low = node.get("lowFindings").asInt();
                } catch (Exception ignored) {}
            }

            history.add(new TrendDataPoint(
                    r.getId(),
                    r.getCreatedAt(),
                    r.getTriggerSource(),
                    r.getOverallScore(),
                    fnScore,
                    respScore,
                    a11yScore,
                    seoScore,
                    visScore,
                    crit,
                    high,
                    med,
                    low,
                    r.getDurationMs()
            ));
        }

        return new ProjectTrendsDto(
                project.getId(),
                project.getName(),
                project.getTargetUrl(),
                totalRuns,
                completedCount,
                avgScore,
                latestScore,
                prevScore,
                scoreDelta,
                trendStatus,
                grade,
                project.getScheduleEnabled(),
                project.getScheduleFrequency(),
                project.getScheduleCron(),
                project.getNextRunAt(),
                project.getLastScheduledRunAt(),
                history
        );
    }
}
