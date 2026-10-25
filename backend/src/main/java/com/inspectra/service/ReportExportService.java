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
        report.put("overallScoreOutOf10", run.getOverallScore() != null ? Math.round((run.getOverallScore() / 10.0) * 10.0) / 10.0 : null);
        report.put("startedAt", run.getStartedAt());
        report.put("completedAt", run.getCompletedAt());
        report.put("durationMs", run.getDurationMs());
        report.put("scoringVersion", run.getScoringVersion() != null ? run.getScoringVersion() : "2.0");

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
        if (run.getOverallScore() != null) {
            double outOf10 = Math.round((run.getOverallScore() / 10.0) * 10.0) / 10.0;
            sb.append("- **Overall Quality Score:** **").append(run.getOverallScore()).append(" / 100** (")
                    .append(outOf10).append(" / 10)\n");
        } else {
            sb.append("- **Overall Quality Score:** N/A (Insufficient Data)\n");
        }
        sb.append("- **Scoring Version:** v").append(run.getScoringVersion() != null ? run.getScoringVersion() : "2.0").append("\n");
        sb.append("- **Execution Timestamp:** ").append(run.getStartedAt() != null ? run.getStartedAt() : "N/A").append("\n");
        if (run.getDurationMs() != null) {
            sb.append("- **Execution Duration:** ").append(String.format("%.2f", run.getDurationMs() / 1000.0)).append("s\n");
        }
        sb.append("- **Tests Executed:** ").append(results.size()).append("\n");
        sb.append("- **Findings Identified:** ").append(findings.size()).append("\n\n");

        Map<String, Object> metricsMap = new HashMap<>();
        try {
            if (run.getMetricsJson() != null) {
                metricsMap = objectMapper.readValue(run.getMetricsJson(), Map.class);
            }
        } catch (Exception ignored) {}

        sb.append("### Quality Score Breakdown\n\n");
        sb.append("| Category | Score (0-100) | Status |\n");
        sb.append("| :--- | :--- | :--- |\n");
        sb.append("| **Functional & Forms** | ").append(formatCatScore(metricsMap.get("functionalScore"))).append(" | ").append(getScoreBadge(metricsMap.get("functionalScore"))).append(" |\n");
        sb.append("| **Responsive Layout** | ").append(formatCatScore(metricsMap.get("responsiveScore"))).append(" | ").append(getScoreBadge(metricsMap.get("responsiveScore"))).append(" |\n");
        sb.append("| **Accessibility (WCAG 2.1 AA)** | ").append(formatCatScore(metricsMap.get("accessibilityScore"))).append(" | ").append(getScoreBadge(metricsMap.get("accessibilityScore"))).append(" |\n");
        sb.append("| **Technical SEO** | ").append(formatCatScore(metricsMap.get("seoScore"))).append(" | ").append(getScoreBadge(metricsMap.get("seoScore"))).append(" |\n");
        sb.append("| **Performance & Web Vitals** | ").append(formatCatScore(metricsMap.get("performanceScore"))).append(" | ").append(getScoreBadge(metricsMap.get("performanceScore"))).append(" |\n");
        sb.append("| **Security & Transport** | ").append(formatCatScore(metricsMap.get("securityScore"))).append(" | ").append(getScoreBadge(metricsMap.get("securityScore"))).append(" |\n\n");

        sb.append("## 2. Audit Scope & Methodology\n\n");
        sb.append("- **Browser Engine:** Isolated Headless Chromium (Playwright Automation Subsystem)\n");
        sb.append("- **Accessibility Engine:** axe-core WCAG 2.1 AA Rule Evaluator\n");
        sb.append("- **Performance Diagnostics:** Navigation Timing API, Paint Timing API (FCP, LCP, TTFB)\n");
        sb.append("- **Security Baseline:** Non-destructive passive inspection of HTTP/TLS, OWASP Security Headers, Cookie flags, Mixed Content\n");
        sb.append("- **Integrity Guarantee:** All reported data is derived from actual browser telemetry. Zero synthetic or fabricated results.\n\n");

        // Performance Telemetry Section
        if (metricsMap.containsKey("performanceData") && metricsMap.get("performanceData") instanceof Map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> pData = (Map<String, Object>) metricsMap.get("performanceData");
            sb.append("## 3. Real Performance & Web Vitals Telemetry (Lab Measurement)\n\n");
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
        sb.append("4. **Active Exploitation:** Security auditing was limited to safe, passive, non-destructive inspection of headers, cookies, and DOM patterns (not a penetration test).\n\n");

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

    public String generateHtmlReport(TestRun run, List<TestResult> results, List<Finding> findings) {
        StringBuilder sb = new StringBuilder();
        int overallScore = run.getOverallScore() != null ? run.getOverallScore() : 0;
        double outOf10 = Math.round((overallScore / 10.0) * 10.0) / 10.0;

        Map<String, Object> metrics = new HashMap<>();
        try {
            if (run.getMetricsJson() != null) {
                metrics = objectMapper.readValue(run.getMetricsJson(), Map.class);
            }
        } catch (Exception ignored) {}

        long passedCount = results.stream().filter(r -> "passed".equalsIgnoreCase(r.getStatus())).count();
        long failedCount = results.stream().filter(r -> "failed".equalsIgnoreCase(r.getStatus())).count();
        long skippedCount = results.stream().filter(r -> "skipped".equalsIgnoreCase(r.getStatus())).count();

        sb.append("<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n");
        sb.append("<meta charset=\"UTF-8\" />\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />\n");
        sb.append("<title>Inspectra Audit Report — ").append(escapeHtml(run.getTargetUrl())).append("</title>\n");
        sb.append("<style>\n");
        sb.append("  :root { --bg: #090d16; --card: #0f172a; --border: #1e293b; --text: #f8fafc; --muted: #94a3b8; --cyan: #06b6d4; --indigo: #6366f1; }\n");
        sb.append("  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); padding: 32px 20px; line-height: 1.6; }\n");
        sb.append("  .container { max-width: 1000px; margin: 0 auto; }\n");
        sb.append("  .header { background: linear-gradient(135deg, #0f172a, #1e1b4b); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 32px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; }\n");
        sb.append("  .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }\n");
        sb.append("  .badge-crit { background: rgba(239,68,68,0.2); color: #f87171; border: 1px solid rgba(239,68,68,0.3); }\n");
        sb.append("  .badge-high { background: rgba(249,115,22,0.2); color: #fb923c; border: 1px solid rgba(249,115,22,0.3); }\n");
        sb.append("  .badge-med { background: rgba(234,179,8,0.2); color: #fde047; border: 1px solid rgba(234,179,8,0.3); }\n");
        sb.append("  .badge-low { background: rgba(59,130,246,0.2); color: #60a5fa; border: 1px solid rgba(59,130,246,0.3); }\n");
        sb.append("  .badge-pass { background: rgba(34,197,94,0.2); color: #4ade80; border: 1px solid rgba(34,197,94,0.3); }\n");
        sb.append("  .badge-fail { background: rgba(239,68,68,0.2); color: #f87171; border: 1px solid rgba(239,68,68,0.3); }\n");
        sb.append("  .badge-skip { background: rgba(148,163,184,0.2); color: #94a3b8; border: 1px solid rgba(148,163,184,0.3); }\n");
        sb.append("  .score-gauge { text-align: center; background: rgba(0,0,0,0.3); padding: 18px 28px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); }\n");
        sb.append("  .score-number { font-size: 42px; font-weight: 900; background: linear-gradient(135deg, #22d3ee, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }\n");
        sb.append("  .card { background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-bottom: 24px; }\n");
        sb.append("  .grid-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-top: 16px; }\n");
        sb.append("  .stat-card { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); padding: 14px; border-radius: 12px; text-align: center; }\n");
        sb.append("  .stat-value { font-size: 22px; font-weight: 800; color: #fff; }\n");
        sb.append("  .stat-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--muted); margin-top: 4px; }\n");
        sb.append("  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 12px; }\n");
        sb.append("  th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--border); }\n");
        sb.append("  th { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }\n");
        sb.append("  .finding-item { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; margin-bottom: 12px; }\n");
        sb.append("  .finding-title { font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }\n");
        sb.append("  .code-box { background: #000; padding: 8px 12px; border-radius: 8px; font-family: monospace; font-size: 12px; color: #38bdf8; overflow-x: auto; margin: 6px 0; }\n");
        sb.append("</style>\n</head>\n<body>\n<div class=\"container\">\n");

        // Header
        sb.append("<div class=\"header\">\n<div>\n");
        sb.append("<span class=\"badge badge-pass\">Inspectra Audit Subsystem</span>\n");
        sb.append("<h1 style=\"margin: 8px 0 4px; font-size: 26px;\">").append(escapeHtml(run.getTargetUrl())).append("</h1>\n");
        sb.append("<div style=\"color: var(--muted); font-size: 12px;\">Run ID: ").append(run.getId()).append(" · Date: ").append(run.getCreatedAt()).append(" · Duration: ").append(run.getDurationMs() != null ? String.format("%.1fs", run.getDurationMs()/1000.0) : "N/A").append("</div>\n");
        sb.append("</div>\n");
        sb.append("<div class=\"score-gauge\">\n");
        sb.append("<div class=\"score-number\">").append(overallScore).append("<span style=\"font-size: 18px; color: var(--muted);\">/100</span></div>\n");
        sb.append("<div style=\"font-size: 12px; font-weight: 600; color: #38bdf8;\">").append(outOf10).append(" / 10 · ").append(getScoreBadge(overallScore)).append("</div>\n");
        sb.append("</div>\n</div>\n");

        // Stats Row
        sb.append("<div class=\"grid-cols\" style=\"margin-bottom: 24px;\">\n");
        sb.append("<div class=\"stat-card\"><div class=\"stat-value\" style=\"color: #4ade80;\">").append(passedCount).append("</div><div class=\"stat-label\">Passed Tests</div></div>\n");
        sb.append("<div class=\"stat-card\"><div class=\"stat-value\" style=\"color: #f87171;\">").append(failedCount).append("</div><div class=\"stat-label\">Failed Tests</div></div>\n");
        sb.append("<div class=\"stat-card\"><div class=\"stat-value\" style=\"color: #94a3b8;\">").append(skippedCount).append("</div><div class=\"stat-label\">Skipped (Safe)</div></div>\n");
        sb.append("<div class=\"stat-card\"><div class=\"stat-value\" style=\"color: #f59e0b;\">").append(findings.size()).append("</div><div class=\"stat-label\">Findings</div></div>\n");
        sb.append("</div>\n");

        // Category Scores Table
        sb.append("<div class=\"card\">\n<h3 style=\"margin-top:0;\">Category Quality Scores</h3>\n");
        sb.append("<table><thead><tr><th>Category</th><th>Score</th><th>Status</th></tr></thead><tbody>\n");
        sb.append("<tr><td>Functional & Forms</td><td><strong>").append(formatCatScore(metrics.get("functionalScore"))).append("</strong></td><td><span class=\"badge badge-pass\">").append(getScoreBadge(metrics.get("functionalScore"))).append("</span></td></tr>\n");
        sb.append("<tr><td>Responsive Layout</td><td><strong>").append(formatCatScore(metrics.get("responsiveScore"))).append("</strong></td><td><span class=\"badge badge-pass\">").append(getScoreBadge(metrics.get("responsiveScore"))).append("</span></td></tr>\n");
        sb.append("<tr><td>Accessibility (WCAG 2.1 AA)</td><td><strong>").append(formatCatScore(metrics.get("accessibilityScore"))).append("</strong></td><td><span class=\"badge badge-pass\">").append(getScoreBadge(metrics.get("accessibilityScore"))).append("</span></td></tr>\n");
        sb.append("<tr><td>Technical SEO</td><td><strong>").append(formatCatScore(metrics.get("seoScore"))).append("</strong></td><td><span class=\"badge badge-pass\">").append(getScoreBadge(metrics.get("seoScore"))).append("</span></td></tr>\n");
        sb.append("<tr><td>Performance & Web Vitals</td><td><strong>").append(formatCatScore(metrics.get("performanceScore"))).append("</strong></td><td><span class=\"badge badge-pass\">").append(getScoreBadge(metrics.get("performanceScore"))).append("</span></td></tr>\n");
        sb.append("<tr><td>Security Baseline</td><td><strong>").append(formatCatScore(metrics.get("securityScore"))).append("</strong></td><td><span class=\"badge badge-pass\">").append(getScoreBadge(metrics.get("securityScore"))).append("</span></td></tr>\n");
        sb.append("</tbody></table></div>\n");

        // Findings
        sb.append("<div class=\"card\">\n<h3 style=\"margin-top:0;\">Confirmed Findings & Evidence</h3>\n");
        if (findings.isEmpty()) {
            sb.append("<p style=\"color: var(--muted);\">No defects detected.</p>\n");
        } else {
            for (Finding f : findings) {
                String sevClass = "badge-low";
                if ("critical".equalsIgnoreCase(f.getSeverity())) sevClass = "badge-crit";
                else if ("high".equalsIgnoreCase(f.getSeverity())) sevClass = "badge-high";
                else if ("medium".equalsIgnoreCase(f.getSeverity())) sevClass = "badge-med";

                sb.append("<div class=\"finding-item\">\n");
                sb.append("<div class=\"finding-title\"><span class=\"badge ").append(sevClass).append("\">").append(f.getSeverity()).append("</span> ").append(escapeHtml(f.getTitle())).append("</div>\n");
                sb.append("<div style=\"font-size: 12px; color: var(--muted); margin-bottom: 6px;\">URL: ").append(escapeHtml(f.getAffectedUrl())).append(" · Category: ").append(f.getCategory()).append("</div>\n");
                sb.append("<p style=\"margin: 6px 0; font-size: 13px;\">").append(escapeHtml(f.getDescription())).append("</p>\n");
                if (f.getSuggestedFix() != null) {
                    sb.append("<div style=\"font-size: 12px; color: #4ade80; margin-top: 4px;\"><strong>Recommended Fix:</strong> ").append(escapeHtml(f.getSuggestedFix())).append("</div>\n");
                }
                sb.append("</div>\n");
            }
        }
        sb.append("</div>\n");

        // Scope Boundaries & Untested Areas
        sb.append("<div class=\"card\" style=\"border-left: 4px solid var(--cyan);\">\n");
        sb.append("<h4 style=\"margin-top:0;\">Scope Boundaries &amp; Safety Safeguards</h4>\n");
        sb.append("<ul style=\"font-size: 12px; color: var(--muted); padding-left: 18px; margin: 0;\">\n");
        sb.append("<li><strong>Destructive Guard:</strong> Irreversible operations (delete, financial checkout, purchase, account deletion) were safely identified and excluded.</li>\n");
        sb.append("<li><strong>Domain Scope:</strong> Crawling and audits strictly honored same-origin boundaries without traversing third-party domains.</li>\n");
        sb.append("<li><strong>Security Baseline:</strong> Safe, passive inspection of security headers, cookies, and DOM protocols (not a full penetration test).</li>\n");
        sb.append("</ul>\n</div>\n");

        sb.append("</div>\n</body>\n</html>\n");
        return sb.toString();
    }

    private String formatCatScore(Object scoreObj) {
        if (scoreObj == null) return "Untested";
        return scoreObj.toString() + "/100";
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private String getScoreBadge(Object scoreObj) {
        if (scoreObj == null) return "Not Tested";
        int score = 0;
        if (scoreObj instanceof Number n) score = n.intValue();
        if (score >= 90) return "Excellent";
        if (score >= 70) return "Acceptable";
        return "Needs Remediation";
    }

    public byte[] generatePdfReport(TestRun run, List<TestResult> results, List<Finding> findings) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 36, 36, 40, 40);

        try {
            PdfWriter.getInstance(document, baos);
            document.open();

            // Document Header
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, new Color(139, 124, 255));
            Paragraph title = new Paragraph("INSPECTRA — TEST AUDIT REPORT", titleFont);
            title.setAlignment(Element.ALIGN_LEFT);
            title.setSpacingAfter(6);
            document.add(title);

            Font subFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.DARK_GRAY);
            Paragraph tagline = new Paragraph("Autonomous Evidence-Driven Website Testing & Defect Intelligence Platform", subFont);
            tagline.setSpacingAfter(18);
            document.add(tagline);

            // Summary Table
            PdfPTable summaryTable = new PdfPTable(2);
            summaryTable.setWidthPercentage(100);
            summaryTable.setSpacingAfter(16);

            addCell(summaryTable, "Target URL", true);
            addCell(summaryTable, run.getTargetUrl(), false);
            addCell(summaryTable, "Audit Run ID", true);
            addCell(summaryTable, run.getId(), false);
            addCell(summaryTable, "Overall Score", true);
            int score = run.getOverallScore() != null ? run.getOverallScore() : 0;
            double outOf10 = Math.round((score / 10.0) * 10.0) / 10.0;
            addCell(summaryTable, score + " / 100 (" + outOf10 + " / 10)", false);
            addCell(summaryTable, "Scoring Version", true);
            addCell(summaryTable, "v" + (run.getScoringVersion() != null ? run.getScoringVersion() : "2.0"), false);
            addCell(summaryTable, "Tests Executed", true);
            addCell(summaryTable, String.valueOf(results.size()), false);
            addCell(summaryTable, "Findings Discovered", true);
            addCell(summaryTable, String.valueOf(findings.size()), false);

            document.add(summaryTable);

            // Findings Section
            Font sectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, Color.BLACK);
            Paragraph findingsHeader = new Paragraph("Identified Findings (" + findings.size() + ")", sectionFont);
            findingsHeader.setSpacingAfter(10);
            document.add(findingsHeader);

            Font fTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, Color.BLACK);
            Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.DARK_GRAY);

            if (findings.isEmpty()) {
                document.add(new Paragraph("No quality defects or compliance violations detected.", bodyFont));
            } else {
                for (Finding f : findings) {
                    Paragraph fTitle = new Paragraph("[" + f.getSeverity().toUpperCase() + "] " + f.getTitle(), fTitleFont);
                    document.add(fTitle);

                    Paragraph fDetails = new Paragraph(
                            "URL: " + f.getAffectedUrl() + " | Category: " + f.getCategory() + "\n" +
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
}
