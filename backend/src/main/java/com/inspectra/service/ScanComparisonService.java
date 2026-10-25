package com.inspectra.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inspectra.model.Finding;
import com.inspectra.model.TestRun;
import com.inspectra.repository.FindingRepository;
import com.inspectra.repository.TestRunRepository;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class ScanComparisonService {

    private final TestRunRepository testRunRepository;
    private final FindingRepository findingRepository;
    private final ObjectMapper objectMapper;

    public ScanComparisonService(
            TestRunRepository testRunRepository,
            FindingRepository findingRepository,
            ObjectMapper objectMapper
    ) {
        this.testRunRepository = testRunRepository;
        this.findingRepository = findingRepository;
        this.objectMapper = objectMapper;
    }

    public record RunComparisonDto(
            String baseRunId,
            String targetRunId,
            String baseTargetUrl,
            String targetUrl,
            String baseCreatedAt,
            String targetCreatedAt,
            Integer baseOverallScore,
            Integer targetOverallScore,
            Integer scoreDelta,
            Map<String, Object> baseMetrics,
            Map<String, Object> targetMetrics,
            List<Finding> newFindings,
            List<Finding> resolvedFindings,
            List<Finding> persistentFindings,
            int totalNewFindings,
            int totalResolvedFindings,
            int totalPersistentFindings
    ) {}

    public RunComparisonDto compareRuns(String baseRunId, String targetRunId) {
        TestRun baseRun = testRunRepository.findById(baseRunId)
                .orElseThrow(() -> new IllegalArgumentException("Base test run not found: " + baseRunId));
        TestRun targetRun = testRunRepository.findById(targetRunId)
                .orElseThrow(() -> new IllegalArgumentException("Target test run not found: " + targetRunId));

        List<Finding> baseFindings = findingRepository.findByTestRunId(baseRunId);
        List<Finding> targetFindings = findingRepository.findByTestRunId(targetRunId);

        // Map findings by fingerprint (category + title + affectedUrl)
        Map<String, Finding> baseMap = new HashMap<>();
        for (Finding f : baseFindings) {
            String key = makeFingerprint(f);
            baseMap.put(key, f);
        }

        Map<String, Finding> targetMap = new HashMap<>();
        for (Finding f : targetFindings) {
            String key = makeFingerprint(f);
            targetMap.put(key, f);
        }

        List<Finding> newFindings = new ArrayList<>();
        List<Finding> persistentFindings = new ArrayList<>();
        for (Map.Entry<String, Finding> entry : targetMap.entrySet()) {
            if (baseMap.containsKey(entry.getKey())) {
                persistentFindings.add(entry.getValue());
            } else {
                newFindings.add(entry.getValue());
            }
        }

        List<Finding> resolvedFindings = new ArrayList<>();
        for (Map.Entry<String, Finding> entry : baseMap.entrySet()) {
            if (!targetMap.containsKey(entry.getKey())) {
                resolvedFindings.add(entry.getValue());
            }
        }

        Integer baseScore = baseRun.getOverallScore();
        Integer targetScore = targetRun.getOverallScore();
        Integer scoreDelta = (baseScore != null && targetScore != null) ? targetScore - baseScore : null;

        Map<String, Object> baseMetrics = parseMetrics(baseRun.getMetricsJson());
        Map<String, Object> targetMetrics = parseMetrics(targetRun.getMetricsJson());

        return new RunComparisonDto(
                baseRunId,
                targetRunId,
                baseRun.getTargetUrl(),
                targetRun.getTargetUrl(),
                baseRun.getCreatedAt() != null ? baseRun.getCreatedAt().toString() : null,
                targetRun.getCreatedAt() != null ? targetRun.getCreatedAt().toString() : null,
                baseScore,
                targetScore,
                scoreDelta,
                baseMetrics,
                targetMetrics,
                newFindings,
                resolvedFindings,
                persistentFindings,
                newFindings.size(),
                resolvedFindings.size(),
                persistentFindings.size()
        );
    }

    private String makeFingerprint(Finding f) {
        return (f.getCategory() + "::" + f.getTitle() + "::" + f.getAffectedUrl()).toLowerCase();
    }

    private Map<String, Object> parseMetrics(String json) {
        if (json == null || json.isBlank()) return Map.of();
        try {
            return objectMapper.readValue(json, Map.class);
        } catch (Exception e) {
            return Map.of();
        }
    }
}
