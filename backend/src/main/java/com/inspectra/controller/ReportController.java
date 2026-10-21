package com.inspectra.controller;

import com.inspectra.model.Finding;
import com.inspectra.model.TestResult;
import com.inspectra.model.TestRun;
import com.inspectra.repository.FindingRepository;
import com.inspectra.repository.TestResultRepository;
import com.inspectra.repository.TestRunRepository;
import com.inspectra.service.ReportExportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/runs")
public class ReportController {

    private final TestRunRepository testRunRepository;
    private final TestResultRepository testResultRepository;
    private final FindingRepository findingRepository;
    private final ReportExportService reportExportService;

    public ReportController(
            TestRunRepository testRunRepository,
            TestResultRepository testResultRepository,
            FindingRepository findingRepository,
            ReportExportService reportExportService
    ) {
        this.testRunRepository = testRunRepository;
        this.testResultRepository = testResultRepository;
        this.findingRepository = findingRepository;
        this.reportExportService = reportExportService;
    }

    @GetMapping("/{id}/report")
    public ResponseEntity<?> getReport(@PathVariable String id) {
        Optional<TestRun> runOpt = testRunRepository.findById(id);
        if (runOpt.isEmpty()) return ResponseEntity.notFound().build();

        TestRun run = runOpt.get();
        List<TestResult> results = testResultRepository.findByTestRunId(id);
        List<Finding> findings = findingRepository.findByTestRunId(id);

        Map<String, Object> report = reportExportService.generateJsonReport(run, results, findings);
        return ResponseEntity.ok(report);
    }

    @GetMapping(value = "/{id}/report.json", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> downloadJsonReport(@PathVariable String id) {
        Optional<TestRun> runOpt = testRunRepository.findById(id);
        if (runOpt.isEmpty()) return ResponseEntity.notFound().build();

        TestRun run = runOpt.get();
        List<TestResult> results = testResultRepository.findByTestRunId(id);
        List<Finding> findings = findingRepository.findByTestRunId(id);

        Map<String, Object> report = reportExportService.generateJsonReport(run, results, findings);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"inspectra-report-" + id + ".json\"")
                .body(report);
    }

    @GetMapping(value = "/{id}/report.pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> downloadPdfReport(@PathVariable String id) {
        Optional<TestRun> runOpt = testRunRepository.findById(id);
        if (runOpt.isEmpty()) return ResponseEntity.notFound().build();

        TestRun run = runOpt.get();
        List<TestResult> results = testResultRepository.findByTestRunId(id);
        List<Finding> findings = findingRepository.findByTestRunId(id);

        byte[] pdfBytes = reportExportService.generatePdfReport(run, results, findings);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"inspectra-report-" + id + ".pdf\"")
                .body(pdfBytes);
    }
}
