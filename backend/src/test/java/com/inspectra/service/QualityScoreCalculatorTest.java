package com.inspectra.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inspectra.model.Finding;
import com.inspectra.model.TestResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class QualityScoreCalculatorTest {

    private QualityScoreCalculator calculator;

    @BeforeEach
    void setUp() {
        calculator = new QualityScoreCalculator(new ObjectMapper());
    }

    @Test
    void testEmptyResultsReturnZeroScoreAndNullCategories() {
        QualityScoreCalculator.CalculatedQualityMetrics breakdown = calculator.calculate(List.of(), List.of());

        assertNotNull(breakdown);
        assertEquals(0, breakdown.overallScore());
        assertEquals(0.0, breakdown.overallScoreOutOf10());
        assertNull(breakdown.functionalScore());
        assertNull(breakdown.accessibilityScore());
        assertNull(breakdown.seoScore());
        assertNull(breakdown.performanceScore());
        assertNull(breakdown.securityScore());
        assertEquals(0, breakdown.passedCount());
        assertEquals(0, breakdown.failedCount());
        assertEquals(0, breakdown.skippedCount());
    }

    @Test
    void testSkippedTestsDoNotCountAsPasses() {
        List<TestResult> results = new ArrayList<>();

        // 1 passed, 1 skipped in functional
        results.add(createResult("func-1", "functional", "PASSED", 100L));
        results.add(createResult("func-2", "functional", "SKIPPED", 0L));

        QualityScoreCalculator.CalculatedQualityMetrics breakdown = calculator.calculate(results, List.of());

        assertEquals(1, breakdown.passedCount());
        assertEquals(0, breakdown.failedCount());
        assertEquals(1, breakdown.skippedCount());

        // Functional has 1 pass out of 1 active executed test -> 100%
        assertEquals(100, breakdown.functionalScore());

        // Other unexecuted categories are null (not falsely 100%)
        assertNull(breakdown.accessibilityScore());
        assertNull(breakdown.seoScore());
        assertNull(breakdown.performanceScore());
        assertNull(breakdown.securityScore());

        // Overall score out of 10 should be 10.0 since only functional ran and scored 100%
        assertEquals(10.0, breakdown.overallScoreOutOf10());
    }

    @Test
    void testFailedAndWarningTestsAffectScore() {
        List<TestResult> results = new ArrayList<>();

        // 1 pass, 1 fail in security
        results.add(createResult("sec-1", "security", "PASSED", 50L));
        results.add(createResult("sec-2", "security", "FAILED", 50L));
        // 1 warning in SEO
        results.add(createResult("seo-1", "seo", "WARNING", 50L));

        Finding highFinding = new Finding();
        highFinding.setSeverity("HIGH");
        highFinding.setCategory("security");

        QualityScoreCalculator.CalculatedQualityMetrics breakdown = calculator.calculate(results, List.of(highFinding));

        assertEquals(1, breakdown.passedCount());
        assertEquals(1, breakdown.failedCount());
        assertEquals(1, breakdown.warningCount());
        assertEquals(50, breakdown.securityScore()); // 1 pass / 2 executed = 50%
        assertEquals(0, breakdown.seoScore());       // warning is not a pass in seo

        assertTrue(breakdown.overallScore() >= 0 && breakdown.overallScore() <= 100);
        assertTrue(breakdown.overallScoreOutOf10() >= 0.0 && breakdown.overallScoreOutOf10() <= 10.0);
        assertNotNull(breakdown.metricsJson());
        assertTrue(breakdown.metricsJson().contains("scoringMethodology"));
    }

    private TestResult createResult(String name, String category, String status, Long durationMs) {
        TestResult tr = new TestResult();
        tr.setName(name);
        tr.setCategory(category);
        tr.setStatus(status);
        tr.setDurationMs(durationMs);
        return tr;
    }
}
