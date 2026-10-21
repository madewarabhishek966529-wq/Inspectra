package com.inspectra.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "execution_events")
public class ExecutionEvent {
    @Id
    private String id;

    @Column(name = "test_run_id", nullable = false)
    private String testRunId;

    @Column(name = "sequence_number")
    private Integer sequenceNumber;

    @Column(name = "event_type", nullable = false, length = 32)
    private String eventType;

    @Column(length = 64)
    private String step;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(name = "payload_json", columnDefinition = "TEXT")
    private String payloadJson;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public ExecutionEvent() {}

    public ExecutionEvent(String id, String testRunId, Integer sequenceNumber, String eventType, String step, String message, String payloadJson) {
        this.id = id;
        this.testRunId = testRunId;
        this.sequenceNumber = sequenceNumber;
        this.eventType = eventType;
        this.step = step;
        this.message = message;
        this.payloadJson = payloadJson;
        this.createdAt = Instant.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTestRunId() { return testRunId; }
    public void setTestRunId(String testRunId) { this.testRunId = testRunId; }

    public Integer getSequenceNumber() { return sequenceNumber; }
    public void setSequenceNumber(Integer sequenceNumber) { this.sequenceNumber = sequenceNumber; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getStep() { return step; }
    public void setStep(String step) { this.step = step; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getPayloadJson() { return payloadJson; }
    public void setPayloadJson(String payloadJson) { this.payloadJson = payloadJson; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
