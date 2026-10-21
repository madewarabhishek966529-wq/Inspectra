package com.inspectra.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "test_artifacts")
public class TestArtifact {
    @Id
    private String id;

    @Column(name = "test_run_id", nullable = false)
    private String testRunId;

    @Column(name = "finding_id")
    private String findingId;

    @Column(name = "artifact_type", nullable = false, length = 32)
    private String artifactType; // screenshot, diff, trace, log

    @Column(nullable = false)
    private String name;

    @Column(name = "storage_path", nullable = false, length = 1024)
    private String storagePath;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public TestArtifact() {}

    public TestArtifact(String id, String testRunId, String findingId, String artifactType, String name, String storagePath) {
        this.id = id;
        this.testRunId = testRunId;
        this.findingId = findingId;
        this.artifactType = artifactType;
        this.name = name;
        this.storagePath = storagePath;
        this.createdAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTestRunId() { return testRunId; }
    public void setTestRunId(String testRunId) { this.testRunId = testRunId; }

    public String getFindingId() { return findingId; }
    public void setFindingId(String findingId) { this.findingId = findingId; }

    public String getArtifactType() { return artifactType; }
    public void setArtifactType(String artifactType) { this.artifactType = artifactType; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getStoragePath() { return storagePath; }
    public void setStoragePath(String storagePath) { this.storagePath = storagePath; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
