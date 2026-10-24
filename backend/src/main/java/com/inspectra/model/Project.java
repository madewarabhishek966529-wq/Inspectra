package com.inspectra.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "projects")
public class Project {
    @Id
    private String id;

    @Column(name = "owner_id", nullable = false)
    private String ownerId;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "target_url", nullable = false, length = 1024)
    private String targetUrl;

    @Column(name = "configuration_json", columnDefinition = "TEXT")
    private String configurationJson;

    @Column(name = "schedule_enabled")
    private Boolean scheduleEnabled = false;

    @Column(name = "schedule_frequency")
    private String scheduleFrequency;

    @Column(name = "schedule_cron")
    private String scheduleCron;

    @Column(name = "last_scheduled_run_at")
    private Instant lastScheduledRunAt;

    @Column(name = "next_run_at")
    private Instant nextRunAt;

    @Column(name = "alert_on_critical")
    private Boolean alertOnCritical = true;


    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Project() {}

    public Project(String id, String ownerId, String name, String description, String targetUrl, String configurationJson) {
        this.id = id;
        this.ownerId = ownerId;
        this.name = name;
        this.description = description;
        this.targetUrl = targetUrl;
        this.configurationJson = configurationJson;
        this.scheduleEnabled = false;
        this.alertOnCritical = true;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getOwnerId() { return ownerId; }
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getTargetUrl() { return targetUrl; }
    public void setTargetUrl(String targetUrl) { this.targetUrl = targetUrl; }

    public String getConfigurationJson() { return configurationJson; }
    public void setConfigurationJson(String configurationJson) { this.configurationJson = configurationJson; }

    public Boolean getScheduleEnabled() { return scheduleEnabled != null && scheduleEnabled; }
    public void setScheduleEnabled(Boolean scheduleEnabled) { this.scheduleEnabled = scheduleEnabled; }

    public String getScheduleFrequency() { return scheduleFrequency; }
    public void setScheduleFrequency(String scheduleFrequency) { this.scheduleFrequency = scheduleFrequency; }

    public String getScheduleCron() { return scheduleCron; }
    public void setScheduleCron(String scheduleCron) { this.scheduleCron = scheduleCron; }

    public Instant getLastScheduledRunAt() { return lastScheduledRunAt; }
    public void setLastScheduledRunAt(Instant lastScheduledRunAt) { this.lastScheduledRunAt = lastScheduledRunAt; }

    public Instant getNextRunAt() { return nextRunAt; }
    public void setNextRunAt(Instant nextRunAt) { this.nextRunAt = nextRunAt; }

    public Boolean getAlertOnCritical() { return alertOnCritical != null && alertOnCritical; }
    public void setAlertOnCritical(Boolean alertOnCritical) { this.alertOnCritical = alertOnCritical; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}

