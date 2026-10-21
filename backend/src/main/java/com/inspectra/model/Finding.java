package com.inspectra.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "findings")
public class Finding {
    @Id
    private String id;

    @Column(name = "test_run_id", nullable = false)
    private String testRunId;

    @Column(nullable = false, length = 512)
    private String title;

    @Column(nullable = false, length = 64)
    private String category;

    @Column(nullable = false, length = 32)
    private String severity; // critical, high, medium, low, info

    @Column(name = "affected_url", nullable = false, length = 1024)
    private String affectedUrl;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "reproduction_steps_json", columnDefinition = "TEXT")
    private String reproductionStepsJson;

    @Column(name = "expected_result", columnDefinition = "TEXT")
    private String expectedResult;

    @Column(name = "actual_result", columnDefinition = "TEXT")
    private String actualResult;

    @Column(name = "suggested_fix", columnDefinition = "TEXT")
    private String suggestedFix;

    private Double confidence = 1.0;

    @Column(name = "verification_status", length = 32)
    private String verificationStatus = "verified";

    @Column(name = "evidence_json", columnDefinition = "TEXT")
    private String evidenceJson;

    @Column(name = "ai_enhanced")
    private Boolean aiEnhanced = false;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public Finding() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTestRunId() { return testRunId; }
    public void setTestRunId(String testRunId) { this.testRunId = testRunId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public String getAffectedUrl() { return affectedUrl; }
    public void setAffectedUrl(String affectedUrl) { this.affectedUrl = affectedUrl; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getReproductionStepsJson() { return reproductionStepsJson; }
    public void setReproductionStepsJson(String reproductionStepsJson) { this.reproductionStepsJson = reproductionStepsJson; }

    public String getExpectedResult() { return expectedResult; }
    public void setExpectedResult(String expectedResult) { this.expectedResult = expectedResult; }

    public String getActualResult() { return actualResult; }
    public void setActualResult(String actualResult) { this.actualResult = actualResult; }

    public String getSuggestedFix() { return suggestedFix; }
    public void setSuggestedFix(String suggestedFix) { this.suggestedFix = suggestedFix; }

    public Double getConfidence() { return confidence; }
    public void setConfidence(Double confidence) { this.confidence = confidence; }

    public String getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(String verificationStatus) { this.verificationStatus = verificationStatus; }

    public String getEvidenceJson() { return evidenceJson; }
    public void setEvidenceJson(String evidenceJson) { this.evidenceJson = evidenceJson; }

    public Boolean getAiEnhanced() { return aiEnhanced; }
    public void setAiEnhanced(Boolean aiEnhanced) { this.aiEnhanced = aiEnhanced; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
