package com.inspectra.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inspectra.model.Finding;
import com.inspectra.model.TestResult;
import com.inspectra.model.TestRun;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ReportExportService {

    private final ObjectMapper objectMapper;

    public ReportExportService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> generateJsonReport(TestRun run, List<TestResult> results, List<Finding> findings) {
        Map<String, Object> report = new HashMap<>();
        report.put("runId", run.getId());
        report.put("projectId", run.getProjectId());
        report.put("targetUrl", run.getTargetUrl());
        report.put("status", run.getStatus());
        report.put("overallScore", run.getOverallScore());
        report.put("startedAt", run.getStartedAt());
        report.put("completedAt", run.getCompletedAt());
        report.put("durationMs", run.getDurationMs());
        report.put("scoringVersion", run.getScoringVersion());

        try {
            report.put("metrics", objectMapper.readValue(run.getMetricsJson() != null ? run.getMetricsJson() : "{}", Map.class));
        } catch (Exception e) {
            report.put("metrics", Map.of());
        }

        report.put("results", results);
        report.put("findings", findings);
        return report;
    }

    public String generateMarkdownReport(TestRun run, List<TestResult> results, List<Finding> findings) {
        StringBuilder sb = new StringBuilder();
        sb.append("# INSPECTRA AUDIT REPORT — ").append(run.getTargetUrl()).append("\n\n");
        sb.append("> **Autonomous Evidence-Driven Website Quality Assurance & Defect Telemetry**\n\n");

        sb.append("## 1. Executive Summary\n\n");
        sb.append("- **Target URL:** `").append(run.getTargetUrl()).append("`\n");
        sb.append("- **Audit Run ID:** `").append(run.getId()).append("`\n");
        sb.append("- **Status:** `").append(run.getStatus()).append("`\n");
        sb.append("- **Overall Quality Score:** **").append(run.getOverallScore() != null ? run.getOverallScore() : "N/A").append(" / 100**\n");
        sb.append("- **Execution Timestamp:** ").append(run.getStartedAt() != null ? run.getStartedAt() : "N/A").append("\n");
        if (run.getDurationMs() != null) {
            sb.append("- **Execution Duration:** ").append(String.format("%.2f", run.getDurationMs() / 1000.0)).append("s\n");
        }
        sb.append("- **Tests Executed:** ").append(results.size()).append("\n");
        sb.append("- **Findings Identified:** ").append(findings.size()).append("\n\n");

        // Parse metrics json if present
        Map<String, Object> metricsMap = new HashMap<>();
        try {
            if (run.getMetricsJson() != null) {
                metricsMap = objectMapper.readValue(run.getMetricsJson(), Map.class);
            }
        } catch (Exception ignored) {}

        sb.append("### Quality Score Breakdown\n\n");
        sb.append("| Category | Score | Status |\n");
        sb.append("| :--- | :--- | :--- |\n");
        sb.append("| **Functional & Forms** | ").append(metricsMap.getOrDefault("functionalScore", "N/A")).append("/100 | ").append(getScoreBadge(metricsMap.get("functionalScore"))).append(" |\n");
        sb.append("| **Responsive Layout** | ").append(metricsMap.getOrDefault("responsiveScore", "N/A")).append("/100 | ").append(getScoreBadge(metricsMap.get("responsiveScore"))).append(" |\n");
        sb.append("| **Accessibility (WCAG 2.2 AA)** | ").append(metricsMap.getOrDefault("accessibilityScore", "N/A")).append("/100 | ").append(getScoreBadge(metricsMap.get("accessibilityScore"))).append(" |\n");
        sb.append("| **Technical SEO** | ").append(metricsMap.getOrDefault("seoScore", "N/A")).append("/100 | ").append(getScoreBadge(metricsMap.get("seoScore"))).append(" |\n");
        sb.append("| **Performance & Web Vitals** | ").append(metricsMap.getOrDefault("performanceScore", "N/A")).append("/100 | ").append(getScoreBadge(metricsMap.get("performanceScore"))).append(" |\n");
        sb.append("| **Security & Transport** | ").append(metricsMap.getOrDefault("securityScore", "N/A")).append("/100 | ").append(getScoreBadge(metricsMap.get("securityScore"))).append(" |\n\n");

        sb.append("## 2. Audit Scope & Methodology\n\n");
        sb.append("- **Browser Engine:** Isolated Headless Chromium (Playwright Automation Subsystem)\n");
        sb.append("- **Accessibility Engine:** axe-core WCAG 2.1 / 2.2 Rule Evaluator\n");
        sb.append("- **Performance Diagnostics:** Navigation Timing API, Paint Timing API, Resource Timings\n");
        sb.append("- **Security Checks:** Non-destructive HTTP/TLS configuration, OWASP Secure Headers, Cookie Security, DOM XSS checks\n");
        sb.append("- **Integrity Guarantee:** All reported data is derived from actual browser telemetry. Zero synthetic or fabricated results.\n\n");

        // Performance Telemetry Section
        if (metricsMap.containsKey("performanceData") && metricsMap.get("performanceData") instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> pData = (Map<String, Object>) metricsMap.get("performanceData");
            sb.append("## 3. Real Performance & Web Vitals Telemetry\n\n");
            sb.append("| Metric | Measured Value | Standard Target |\n");
            sb.append("| :--- | :--- | :--- |\n");
            sb.append("| **Time to First Byte (TTFB)** | ").append(pData.getOrDefault("ttfbMs", 0)).append(" ms | < 800 ms |\n");
            sb.append("| **First Contentful Paint (FCP)** | ").append(pData.getOrDefault("fcpMs", 0)).append(" ms | < 1800 ms |\n");
            sb.append("| **DOM Content Loaded** | ").append(pData.getOrDefault("domContentLoadedMs", 0)).append(" ms | < 2500 ms |\n");
            sb.append("| **Page Load Complete** | ").append(pData.getOrDefault("loadTimeMs", 0)).append(" ms | < 4000 ms |\n");
            sb.append("| **Render-Blocking Scripts** | ").append(pData.getOrDefault("renderBlockingCount", 0)).append(" | 0 |\n");
            sb.append("| **Total Resources Loaded** | ").append(pData.getOrDefault("totalResources", 0)).append(" assets | Optimized |\n\n");
        }

        // Findings Section
        sb.append("## 4. Confirmed Findings & Defect Telemetry\n\n");
        if (findings.isEmpty()) {
            sb.append("_No defects or quality anomalies were detected during this execution._\n\n");
        } else {
            for (Finding f : findings) {
                sb.append("### [").append(f.getSeverity().toUpperCase()).append("] ").append(f.getTitle()).append("\n\n");
                sb.append("- **Finding ID:** `").append(f.getId()).append("`\n");
                sb.append("- **Category:** `").append(f.getCategory()).append("`\n");
                sb.append("- **Severity:** `").append(f.getSeverity().toUpperCase()).append("`\n");
                sb.append("- **Affected URL:** `").append(f.getAffectedUrl()).append("`\n");
                sb.append("- **Remediation Status:** `").append(f.getRemediationStatus() != null ? f.getRemediationStatus() : "OPEN").append("`\n");
                if (f.getDetectionMethod() != null) {
                    sb.append("- **Detection Method:** ").append(f.getDetectionMethod()).append("\n");
                }
                sb.append("\n**Description:**\n").append(f.getDescription()).append("\n\n");
                
                if (f.getTechnicalExplanation() != null && !f.getTechnicalExplanation().isBlank()) {
                    sb.append("**Technical Explanation:**\n").append(f.getTechnicalExplanation()).append("\n\n");
                }
                
                if (f.getReproductionStepsJson() != null && !f.getReproductionStepsJson().isBlank()) {
                    sb.append("**Reproduction Steps:**\n").append(f.getReproductionStepsJson()).append("\n\n");
                }
                
                if (f.getExpectedResult() != null && !f.getExpectedResult().isBlank()) {
                    sb.append("- **Expected Outcome:** ").append(f.getExpectedResult()).append("\n");
                }
                if (f.getActualResult() != null && !f.getActualResult().isBlank()) {
                    sb.append("- **Actual Observed:** ").append(f.getActualResult()).append("\n");
                }
                if (f.getSuggestedFix() != null && !f.getSuggestedFix().isBlank()) {
                    sb.append("\n**Recommended Fix:**\n").append(f.getSuggestedFix()).append("\n\n");
                }
                if (f.getVerificationProcedure() != null && !f.getVerificationProcedure().isBlank()) {
                    sb.append("**Verification Procedure:**\n").append(f.getVerificationProcedure()).append("\n\n");
                }
                sb.append("---\n\n");
            }
        }

        // Untested Areas
        sb.append("## 5. Untested Areas & Scope Boundaries\n\n");
        sb.append("In accordance with ethical automated testing best practices and security constraints:\n");
        sb.append("1. **Destructive Operations:** Form submissions that create financial charges, send external communications, or delete persistent records were intentionally not executed.\n");
        sb.append("2. **Authenticated Pages:** Only publicly accessible pages and explicit guest flows were tested unless authorized test credentials were provided.\n");
        sb.append("3. **External Domains:** Third-party origins linked from the target site were not traversed to honor same-origin scope boundaries.\n");
        sb.append("4. **Active Exploitation:** Security auditing was limited to safe, passive, non-destructive inspection of headers, cookies, and DOM patterns.\n\n");

        sb.append("## 6. Actionable Remediation Plan\n\n");
        long critCount = findings.stream().filter(f -> "critical".equalsIgnoreCase(f.getSeverity())).count();
        long highCount = findings.stream().filter(f -> "high".equalsIgnoreCase(f.getSeverity())).count();
        if (critCount > 0 || highCount > 0) {
            sb.append("Immediate priority must be given to the **").append(critCount).append(" Critical** and **").append(highCount).append(" High** severity findings identified above before moving to routine accessibility or SEO enhancements.\n\n");
        } else {
            sb.append("No critical or high severity defects were observed. Focus remediation efforts on medium/low warnings to improve usability and compliance.\n\n");
        }
        sb.append("_Generated autonomously by Inspectra Audit Subsystem._\n");

        return sb.toString();
    }

    private String getScoreBadge(Object scoreObj) {
        if (scoreObj == null) return "Unknown";
        int score = 0;
        if (scoreObj instanceof Number n) score = n.intValue();
        if (score >= 90) return "Excellent (Good)";
        if (score >= 70) return "Acceptable (Needs Improvement)";
        return "Critical Attention Required (Poor)";
    }

    public byte[] generatePdfReport(TestRun run, List<TestResult> results, List<Finding> findings) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 36, 36, 40, 40);

        try {
            PdfWriter.getInstance(document, baos);
            document.open();

            // Document Header
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, new Color(139, 124, 255));
            Paragraph title = new Paragraph("INSPECTRA AI — TEST AUDIT REPORT", titleFont);
            title.setAlignment(Element.ALIGN_LEFT);
            title.setSpacingAfter(6);
            document.add(title);

            Font subFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.DARK_GRAY);
            Paragraph tagline = new Paragraph("Autonomous Website Testing & Quality Assurance Platform", subFont);
            tagline.setSpacingAfter(18);
            document.add(tagline);

            // Summary Table
            PdfPTable summaryTable = new PdfPTable(2);
            summaryTable.setWidthPercentage(100);
            summaryTable.setSpacingAfter(20);

            addCell(summaryTable, "Target URL:", true);
            addCell(summaryTable, run.getTargetUrl(), false);
            addCell(summaryTable, "Run ID:", true);
            addCell(summaryTable, run.getId(), false);
            addCell(summaryTable, "Execution Status:", true);
            addCell(summaryTable, run.getStatus(), false);
            addCell(summaryTable, "Overall Quality Score:", true);
            addCell(summaryTable, (run.getOverallScore() != null ? run.getOverallScore() : "N/A") + " / 100", false);
            addCell(summaryTable, "Total Findings:", true);
            addCell(summaryTable, String.valueOf(findings.size()), false);
            addCell(summaryTable, "Tests Executed:", true);
            addCell(summaryTable, String.valueOf(results.size()), false);

            document.add(summaryTable);

            // Findings Section
            Font secFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, new Color(17, 24, 39));
            Paragraph findingsHeader = new Paragraph("Key Findings & Defect Telemetry (" + findings.size() + ")", secFont);
            findingsHeader.setSpacingBefore(10);
            findingsHeader.setSpacingAfter(12);
            document.add(findingsHeader);

            if (findings.isEmpty()) {
                document.add(new Paragraph("No defects or warnings detected during this test run.", subFont));
            } else {
                for (int i = 0; i < findings.size(); i++) {
                    Finding f = findings.get(i);
                    Font findingTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, getSeverityColor(f.getSeverity()));
                    Paragraph fTitle = new Paragraph("[" + f.getSeverity().toUpperCase() + "] " + f.getTitle(), findingTitleFont);
                    fTitle.setSpacingBefore(8);
                    document.add(fTitle);

                    Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);
                    Paragraph fDetails = new Paragraph(
                            "Category: " + f.getCategory() + " | Affected URL: " + f.getAffectedUrl() + "\n" +
                            "Description: " + f.getDescription() + "\n" +
                            (f.getSuggestedFix() != null ? "Suggested Fix: " + f.getSuggestedFix() : ""),
                            bodyFont
                    );
                    fDetails.setSpacingAfter(6);
                    document.add(fDetails);
                }
            }

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF report: " + e.getMessage(), e);
        }
    }

    private void addCell(PdfPTable table, String text, boolean isHeader) {
        Font font = isHeader
                ? FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.BLACK)
                : FontFactory.getFont(FontFactory.HELVETICA, 9, Color.DARK_GRAY);
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(5);
        cell.setBorderColor(new Color(220, 224, 230));
        if (isHeader) {
            cell.setBackgroundColor(new Color(245, 247, 250));
        }
        table.addCell(cell);
    }

    private Color getSeverityColor(String severity) {
        if ("critical".equalsIgnoreCase(severity)) return new Color(220, 38, 38);
        if ("high".equalsIgnoreCase(severity)) return new Color(234, 88, 12);
        if ("medium".equalsIgnoreCase(severity)) return new Color(202, 138, 4);
        return new Color(37, 99, 235);
    }
}
