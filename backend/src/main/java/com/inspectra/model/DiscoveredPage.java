package com.inspectra.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "discovered_pages")
public class DiscoveredPage {
    @Id
    private String id;

    @Column(name = "test_run_id", nullable = false)
    private String testRunId;

    @Column(nullable = false, length = 1024)
    private String url;

    @Column(length = 512)
    private String title;

    @Column(name = "discovery_status", length = 32)
    private String discoveryStatus;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public DiscoveredPage() {}

    public DiscoveredPage(String id, String testRunId, String url, String title, String discoveryStatus) {
        this.id = id;
        this.testRunId = testRunId;
        this.url = url;
        this.title = title;
        this.discoveryStatus = discoveryStatus;
        this.createdAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTestRunId() { return testRunId; }
    public void setTestRunId(String testRunId) { this.testRunId = testRunId; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDiscoveryStatus() { return discoveryStatus; }
    public void setDiscoveryStatus(String discoveryStatus) { this.discoveryStatus = discoveryStatus; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
