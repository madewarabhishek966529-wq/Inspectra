package com.inspectra.controller;

import com.inspectra.model.Finding;
import com.inspectra.repository.FindingRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/findings")
public class FindingController {

    private final FindingRepository findingRepository;

    public FindingController(FindingRepository findingRepository) {
        this.findingRepository = findingRepository;
    }

    @GetMapping
    public ResponseEntity<List<Finding>> listFindings(
            @RequestParam(required = false) String runId,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String category
    ) {
        if (runId != null) {
            if (severity != null) {
                return ResponseEntity.ok(findingRepository.findByTestRunIdAndSeverity(runId, severity));
            }
            if (category != null) {
                return ResponseEntity.ok(findingRepository.findByTestRunIdAndCategory(runId, category));
            }
            return ResponseEntity.ok(findingRepository.findByTestRunId(runId));
        }
        return ResponseEntity.ok(findingRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getFinding(@PathVariable String id) {
        return findingRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> updateFinding(@PathVariable String id, @RequestBody Map<String, Object> updates) {
        return findingRepository.findById(id).map(finding -> {
            if (updates.containsKey("verificationStatus")) {
                finding.setVerificationStatus((String) updates.get("verificationStatus"));
            }
            if (updates.containsKey("suggestedFix")) {
                finding.setSuggestedFix((String) updates.get("suggestedFix"));
            }
            Finding saved = findingRepository.save(finding);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }
}
