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
