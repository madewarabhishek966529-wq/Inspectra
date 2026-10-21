package com.inspectra.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "test_results")
public class TestResult {
    @Id
    private String id;

    @Column(name = "test_run_id", nullable = false)
    private String testRunId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, length = 64)
    private String category;

    @Column(length = 1024)
    private String url;

    @Column(nullable = false, length = 32)
    private String status; // passed, failed, skipped, blocked

    @Column(name = "duration_ms")
    private Long durationMs;

    @Column(name = "expected_outcome", columnDefinition = "TEXT")
    private String expectedOutcome;

    @Column(name = "actual_outcome", columnDefinition = "TEXT")
    private String actualOutcome;

    @Column(name = "error_summary", columnDefinition = "TEXT")
    private String errorSummary;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public TestResult() {}

    public TestResult(String id, String testRunId, String name, String category, String url, String status, Long durationMs, String expectedOutcome, String actualOutcome, String errorSummary) {
        this.id = id;
        this.testRunId = testRunId;
        this.name = name;
        this.category = category;
        this.url = url;
        this.status = status;
        this.durationMs = durationMs;
        this.expectedOutcome = expectedOutcome;
        this.actualOutcome = actualOutcome;
        this.errorSummary = errorSummary;
        this.createdAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTestRunId() { return testRunId; }
    public void setTestRunId(String testRunId) { this.testRunId = testRunId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Long getDurationMs() { return durationMs; }
    public void setDurationMs(Long durationMs) { this.durationMs = durationMs; }

    public String getExpectedOutcome() { return expectedOutcome; }
    public void setExpectedOutcome(String expectedOutcome) { this.expectedOutcome = expectedOutcome; }

    public String getActualOutcome() { return actualOutcome; }
    public void setActualOutcome(String actualOutcome) { this.actualOutcome = actualOutcome; }

    public String getErrorSummary() { return errorSummary; }
    public void setErrorSummary(String errorSummary) { this.errorSummary = errorSummary; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
