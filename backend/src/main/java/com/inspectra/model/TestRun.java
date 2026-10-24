package com.inspectra.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "test_runs")
public class TestRun {
    @Id
    private String id;

    @Column(name = "project_id", nullable = false)
    private String projectId;

    @Column(name = "requested_by", nullable = false)
    private String requestedBy;

    @Column(nullable = false, length = 32)
    private String status = "QUEUED"; // QUEUED, DISCOVERING, PLANNING, RUNNING, ANALYZING, COMPLETED, FAILED, CANCELLED

    @Column(name = "target_url", nullable = false, length = 1024)
    private String targetUrl;

    @Column(name = "scoring_version", length = 32)
    private String scoringVersion = "1.0";

    @Column(name = "trigger_source", length = 32)
    private String triggerSource = "MANUAL"; // MANUAL, SCHEDULED, CI_CD

    @Column(name = "overall_score")
    private Integer overallScore;


    @Column(name = "metrics_json", columnDefinition = "TEXT")
    private String metricsJson;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "duration_ms")
    private Long durationMs;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public TestRun() {}

    public TestRun(String id, String projectId, String requestedBy, String targetUrl) {
        this.id = id;
        this.projectId = projectId;
        this.requestedBy = requestedBy;
        this.targetUrl = targetUrl;
        this.status = "QUEUED";
        this.scoringVersion = "1.0";
        this.createdAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getProjectId() { return projectId; }
    public void setProjectId(String projectId) { this.projectId = projectId; }

    public String getRequestedBy() { return requestedBy; }
    public void setRequestedBy(String requestedBy) { this.requestedBy = requestedBy; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getTargetUrl() { return targetUrl; }
    public void setTargetUrl(String targetUrl) { this.targetUrl = targetUrl; }

    public String getScoringVersion() { return scoringVersion; }
    public void setScoringVersion(String scoringVersion) { this.scoringVersion = scoringVersion; }

    public String getTriggerSource() { return triggerSource != null ? triggerSource : "MANUAL"; }
    public void setTriggerSource(String triggerSource) { this.triggerSource = triggerSource; }

    public Integer getOverallScore() { return overallScore; }

    public void setOverallScore(Integer overallScore) { this.overallScore = overallScore; }

    public String getMetricsJson() { return metricsJson; }
    public void setMetricsJson(String metricsJson) { this.metricsJson = metricsJson; }

    public Instant getStartedAt() { return startedAt; }
    public void setStartedAt(Instant startedAt) { this.startedAt = startedAt; }

    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }

    public Long getDurationMs() { return durationMs; }
    public void setDurationMs(Long durationMs) { this.durationMs = durationMs; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
