package com.inspectra.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inspectra.model.Finding;
import com.inspectra.model.TestResult;
import com.inspectra.model.TestRun;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class ReportExportServiceTest {

    private ReportExportService reportExportService;

    @BeforeEach
    void setUp() {
        reportExportService = new ReportExportService(new ObjectMapper());
    }

    @Test
    void testGenerateHtmlReportContainsExpectedStructureAndData() {
        TestRun run = new TestRun();
        run.setId("run-test-html");
        run.setTargetUrl("https://example.com");
        run.setStatus("COMPLETED");
        run.setOverallScore(88);
        run.setCreatedAt(Instant.now());
        run.setMetricsJson("{\"functionalScore\":90,\"accessibilityScore\":85,\"securityScore\":92}");

        TestResult r1 = new TestResult();
        r1.setName("Page Reachability");
        r1.setStatus("passed");
        r1.setCategory("functional");

        TestResult r2 = new TestResult();
        r2.setName("Destructive Action Safety");
        r2.setStatus("skipped");
        r2.setCategory("functional");

        Finding f1 = new Finding();
        f1.setId("find-1");
        f1.setCategory("accessibility");
        f1.setTitle("Images missing alt attribute");
        f1.setSeverity("HIGH");
        f1.setAffectedUrl("https://example.com");
        f1.setDescription("Observed 2 images without alternative text.");
        f1.setSuggestedFix("Add alt attributes to informative images.");

        String html = reportExportService.generateHtmlReport(run, List.of(r1, r2), List.of(f1));

        assertNotNull(html);
        assertTrue(html.contains("<!DOCTYPE html>"));
        assertTrue(html.contains("Inspectra Audit Report — https://example.com"));
        assertTrue(html.contains("88<span style=\"font-size: 18px; color: var(--muted);\">/100</span>"));
        assertTrue(html.contains("8.8 / 10")); // out of 10 score
        assertTrue(html.contains("Images missing alt attribute"));
        assertTrue(html.contains("Scope Boundaries &amp; Safety Safeguards"));
        assertTrue(html.contains("Destructive Guard:"));
    }

    @Test
    void testGenerateMarkdownReportContainsExecutiveSummaryAndMethodology() {
        TestRun run = new TestRun();
        run.setId("run-test-md");
        run.setTargetUrl("https://test.local");
        run.setStatus("COMPLETED");
        run.setOverallScore(75);
        run.setScoringVersion("2.0");

        String md = reportExportService.generateMarkdownReport(run, List.of(), List.of());

        assertNotNull(md);
        assertTrue(md.contains("# INSPECTRA AUDIT REPORT — https://test.local"));
        assertTrue(md.contains("75 / 100"));
        assertTrue(md.contains("7.5 / 10"));
        assertTrue(md.contains("Scoring Version:** v2.0"));
        assertTrue(md.contains("Audit Scope & Methodology"));
    }

    @Test
    void testGeneratePdfReportProducesNonEmptyBinary() {
        TestRun run = new TestRun();
        run.setId("run-test-pdf");
        run.setTargetUrl("https://example.com");
        run.setStatus("COMPLETED");
        run.setOverallScore(90);

        byte[] pdf = reportExportService.generatePdfReport(run, List.of(), List.of());

        assertNotNull(pdf);
        assertTrue(pdf.length > 0);
        // Standard PDF magic byte sequence %PDF
        assertEquals('%', (char) pdf[0]);
        assertEquals('P', (char) pdf[1]);
        assertEquals('D', (char) pdf[2]);
        assertEquals('F', (char) pdf[3]);
    }
}
