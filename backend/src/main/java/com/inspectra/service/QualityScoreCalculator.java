package com.inspectra.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inspectra.model.Finding;
import com.inspectra.model.TestResult;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
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
            double overallScoreOutOf10,
            Integer functionalScore,
            Integer responsiveScore,
            Integer accessibilityScore,
            Integer seoScore,
            Integer visualScore,
            Integer performanceScore,
            Integer securityScore,
            int totalTests,
            int passedCount,
            int failedCount,
            int warningCount,
            int skippedCount,
            int blockedCount,
            int criticalFindings,
            int highFindings,
            int mediumFindings,
            int lowFindings,
            List<String> untestedCategories,
            String metricsJson
    ) {}

    public CalculatedQualityMetrics calculate(List<TestResult> results, List<Finding> findings) {
        int totalTests = results.size();
        int passedCount = (int) results.stream().filter(r -> "passed".equalsIgnoreCase(r.getStatus())).count();
        int failedCount = (int) results.stream().filter(r -> "failed".equalsIgnoreCase(r.getStatus())).count();
        int skippedCount = (int) results.stream().filter(r -> "skipped".equalsIgnoreCase(r.getStatus())).count();
        int blockedCount = (int) results.stream().filter(r -> "blocked".equalsIgnoreCase(r.getStatus()) || "error".equalsIgnoreCase(r.getStatus())).count();
        int warningCount = (int) results.stream().filter(r -> "warning".equalsIgnoreCase(r.getStatus())).count();

        int critical = (int) findings.stream().filter(f -> "critical".equalsIgnoreCase(f.getSeverity())).count();
        int high = (int) findings.stream().filter(f -> "high".equalsIgnoreCase(f.getSeverity())).count();
        int medium = (int) findings.stream().filter(f -> "medium".equalsIgnoreCase(f.getSeverity())).count();
        int low = (int) findings.stream().filter(f -> "low".equalsIgnoreCase(f.getSeverity()) || "info".equalsIgnoreCase(f.getSeverity())).count();

        // If no explicit test was marked "warning", medium findings count towards warning indicators
        if (warningCount == 0 && medium > 0) {
            warningCount = medium;
        }

        List<String> untestedCategories = new ArrayList<>();
        Integer functionalScore = calculateCategoryScore(results, "functional", untestedCategories);
        Integer responsiveScore = calculateCategoryScore(results, "responsive", untestedCategories);
        Integer accessibilityScore = calculateCategoryScore(results, "accessibility", untestedCategories);
        Integer seoScore = calculateCategoryScore(results, "seo", untestedCategories);
        Integer visualScore = calculateCategoryScore(results, "visual", untestedCategories);
        Integer performanceScore = calculateCategoryScore(results, "performance", untestedCategories);
        Integer securityScore = calculateCategoryScore(results, "security", untestedCategories);

        // Transparent Penalty Formula (v2.0)
        // Skipped tests do NOT count as passes. Passed tests ratio is computed from active executed tests (total - skipped).
        int activeExecutedTests = Math.max(1, totalTests - skippedCount);
        double passRatio = totalTests > 0 ? ((double) passedCount / activeExecutedTests) * 100.0 : 0.0;

        // Weighted penalty based on confirmed findings severity
        int penalty = critical * 15 + high * 8 + medium * 3 + low * 1;
        int overallScore = totalTests == 0 ? 0 : Math.max(0, Math.min(100, (int) Math.round(passRatio - penalty * 0.5)));
        double overallScoreOutOf10 = Math.round(((double) overallScore / 10.0) * 10.0) / 10.0;

        Map<String, Object> map = new HashMap<>();
        map.put("overallScore", overallScore);
        map.put("overallScoreOutOf10", overallScoreOutOf10);
        map.put("functionalScore", functionalScore);
        map.put("responsiveScore", responsiveScore);
        map.put("accessibilityScore", accessibilityScore);
        map.put("seoScore", seoScore);
        map.put("visualScore", visualScore);
        map.put("performanceScore", performanceScore);
        map.put("securityScore", securityScore);
        map.put("totalTests", totalTests);
        map.put("passedCount", passedCount);
        map.put("failedCount", failedCount);
        map.put("warningCount", warningCount);
        map.put("skippedCount", skippedCount);
        map.put("blockedCount", blockedCount);
        map.put("criticalFindings", critical);
        map.put("highFindings", high);
        map.put("mediumFindings", medium);
        map.put("lowFindings", low);
        map.put("untestedCategories", untestedCategories);
        map.put("scoringVersion", "2.0");
        map.put("scoringMethodology", "Evidence-derived composite score (0-100 and 0-10 scale). Base pass ratio from non-skipped tests minus weighted finding deductions (Critical -15, High -8, Medium -3, Low -1). Categories with 0 executed tests are marked Untested rather than defaulted.");

        String json = "{}";
        try {
            json = objectMapper.writeValueAsString(map);
        } catch (Exception ignored) {}

        return new CalculatedQualityMetrics(
                overallScore, overallScoreOutOf10, functionalScore, responsiveScore, accessibilityScore, seoScore, visualScore,
                performanceScore, securityScore,
                totalTests, passedCount, failedCount, warningCount, skippedCount, blockedCount,
                critical, high, medium, low, untestedCategories, json
        );
    }

    private Integer calculateCategoryScore(List<TestResult> results, String category, List<String> untestedList) {
        List<TestResult> catResults = results.stream()
                .filter(r -> category.equalsIgnoreCase(r.getCategory()) ||
                        ("functional".equalsIgnoreCase(category) && ("navigation".equalsIgnoreCase(r.getCategory()) || "forms".equalsIgnoreCase(r.getCategory()) || "console".equalsIgnoreCase(r.getCategory()) || "network".equalsIgnoreCase(r.getCategory()))))
                .toList();

        if (catResults.isEmpty()) {
            untestedList.add(category);
            return null; // Truly untested, not defaulted to 100
        }

        long passed = catResults.stream().filter(r -> "passed".equalsIgnoreCase(r.getStatus())).count();
        long nonSkipped = catResults.stream().filter(r -> !"skipped".equalsIgnoreCase(r.getStatus())).count();
        if (nonSkipped == 0) return 0;
        return (int) Math.round(((double) passed / nonSkipped) * 100.0);
    }
}
