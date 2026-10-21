package com.inspectra.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inspectra.model.Finding;
import com.inspectra.model.TestResult;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class QualityScoreCalculator {
    private final ObjectMapper objectMapper;

    public QualityScoreCalculator(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public record CalculatedQualityMetrics(
            int overallScore,
            int functionalScore,
            int responsiveScore,
            int accessibilityScore,
            int seoScore,
            int visualScore,
            int totalTests,
            int passedCount,
            int failedCount,
            int skippedCount,
            int blockedCount,
            int criticalFindings,
            int highFindings,
            int mediumFindings,
            int lowFindings,
            String metricsJson
    ) {}

    public CalculatedQualityMetrics calculate(List<TestResult> results, List<Finding> findings) {
        int totalTests = results.size();
        int passedCount = (int) results.stream().filter(r -> "passed".equalsIgnoreCase(r.getStatus())).count();
        int failedCount = (int) results.stream().filter(r -> "failed".equalsIgnoreCase(r.getStatus())).count();
        int skippedCount = (int) results.stream().filter(r -> "skipped".equalsIgnoreCase(r.getStatus())).count();
        int blockedCount = (int) results.stream().filter(r -> "blocked".equalsIgnoreCase(r.getStatus())).count();

        int critical = (int) findings.stream().filter(f -> "critical".equalsIgnoreCase(f.getSeverity())).count();
        int high = (int) findings.stream().filter(f -> "high".equalsIgnoreCase(f.getSeverity())).count();
        int medium = (int) findings.stream().filter(f -> "medium".equalsIgnoreCase(f.getSeverity())).count();
        int low = (int) findings.stream().filter(f -> "low".equalsIgnoreCase(f.getSeverity()) || "info".equalsIgnoreCase(f.getSeverity())).count();

        int functionalScore = calculateCategoryScore(results, "functional");
        int responsiveScore = calculateCategoryScore(results, "responsive");
        int accessibilityScore = calculateCategoryScore(results, "accessibility");
        int seoScore = calculateCategoryScore(results, "seo");
        int visualScore = calculateCategoryScore(results, "visual");

        // Transparent Penalty Formula
        int penalty = critical * 15 + high * 8 + medium * 3 + low * 1;
        double passRatio = totalTests > 0 ? ((double) passedCount / totalTests) * 100.0 : 100.0;
        int overallScore = Math.max(0, Math.min(100, (int) Math.round(passRatio - penalty * 0.5)));

        Map<String, Object> map = new HashMap<>();
        map.put("overallScore", overallScore);
        map.put("functionalScore", functionalScore);
        map.put("responsiveScore", responsiveScore);
        map.put("accessibilityScore", accessibilityScore);
        map.put("seoScore", seoScore);
        map.put("visualScore", visualScore);
        map.put("totalTests", totalTests);
        map.put("passedCount", passedCount);
        map.put("failedCount", failedCount);
        map.put("skippedCount", skippedCount);
        map.put("blockedCount", blockedCount);
        map.put("criticalFindings", critical);
        map.put("highFindings", high);
        map.put("mediumFindings", medium);
        map.put("lowFindings", low);
        map.put("scoringVersion", "1.0");

        String json = "{}";
        try {
            json = objectMapper.writeValueAsString(map);
        } catch (Exception ignored) {}

        return new CalculatedQualityMetrics(
                overallScore, functionalScore, responsiveScore, accessibilityScore, seoScore, visualScore,
                totalTests, passedCount, failedCount, skippedCount, blockedCount,
                critical, high, medium, low, json
        );
    }

    private int calculateCategoryScore(List<TestResult> results, String category) {
        List<TestResult> catResults = results.stream()
                .filter(r -> category.equalsIgnoreCase(r.getCategory()))
                .toList();

        if (catResults.isEmpty()) return 100;
        long passed = catResults.stream().filter(r -> "passed".equalsIgnoreCase(r.getStatus())).count();
        return (int) Math.round(((double) passed / catResults.size()) * 100.0);
    }
}
