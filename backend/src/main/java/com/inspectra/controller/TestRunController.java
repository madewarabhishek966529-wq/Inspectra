package com.inspectra.controller;

import com.inspectra.model.TestRun;
import com.inspectra.repository.TestRunRepository;
import com.inspectra.service.SseBroadcaster;
import com.inspectra.service.TestRunService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/runs")
public class TestRunController {

    private final TestRunRepository testRunRepository;
    private final TestRunService testRunService;
    private final SseBroadcaster sseBroadcaster;
    private final com.inspectra.service.ScanComparisonService scanComparisonService;

    public TestRunController(
            TestRunRepository testRunRepository,
            TestRunService testRunService,
            SseBroadcaster sseBroadcaster,
            com.inspectra.service.ScanComparisonService scanComparisonService
    ) {
        this.testRunRepository = testRunRepository;
        this.testRunService = testRunService;
        this.sseBroadcaster = sseBroadcaster;
        this.scanComparisonService = scanComparisonService;
    }

    @GetMapping("/compare")
    public ResponseEntity<?> compareRuns(
            @RequestParam String baseRunId,
            @RequestParam String targetRunId
    ) {
        try {
            var comparison = scanComparisonService.compareRuns(baseRunId, targetRunId);
            return ResponseEntity.ok(comparison);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<List<TestRun>> listRuns(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(testRunRepository.findByRequestedByOrderByCreatedAtDesc(userDetails.getUsername()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getRun(@AuthenticationPrincipal UserDetails userDetails, @PathVariable String id) {
        return testRunRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelRun(@PathVariable String id) {
        testRunService.cancelRun(id);
        return ResponseEntity.ok(Map.of("message", "Cancellation requested for run " + id));
    }

    @PostMapping("/{id}/retry")
    public ResponseEntity<?> retryRun(@AuthenticationPrincipal UserDetails userDetails, @PathVariable String id) {
        return testRunRepository.findById(id)
                .map(existing -> {
                    TestRun newRun = testRunService.initiateRun(
                            existing.getProjectId(),
                            userDetails.getUsername(),
                            new TestRunService.RunRequest(existing.getTargetUrl(), null, null, null, true)
                    );
                    return ResponseEntity.accepted().body(newRun);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping(value = "/{id}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamEvents(@PathVariable String id) {
        return sseBroadcaster.subscribe(id);
    }
}
