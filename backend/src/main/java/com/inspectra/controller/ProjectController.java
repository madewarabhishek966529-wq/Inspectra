package com.inspectra.controller;

import com.inspectra.model.Project;
import com.inspectra.model.TestRun;
import com.inspectra.service.ProjectService;
import com.inspectra.service.TestRunService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;
    private final TestRunService testRunService;

    public ProjectController(ProjectService projectService, TestRunService testRunService) {
        this.projectService = projectService;
        this.testRunService = testRunService;
    }

    public record CreateProjectRequest(String name, String description, String targetUrl, String configurationJson) {}

    @GetMapping
    public ResponseEntity<List<Project>> listProjects(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(projectService.getProjectsForUser(userDetails.getUsername()));
    }

    @PostMapping
    public ResponseEntity<?> createProject(@AuthenticationPrincipal UserDetails userDetails, @RequestBody CreateProjectRequest req) {
        if (req.name() == null || req.name().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Project name is required"));
        }
        if (req.targetUrl() == null || req.targetUrl().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Target URL is required"));
        }

        Project project = projectService.createProject(
                userDetails.getUsername(),
                req.name(),
                req.description(),
                req.targetUrl(),
                req.configurationJson()
        );
        return ResponseEntity.ok(project);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getProject(@AuthenticationPrincipal UserDetails userDetails, @PathVariable String id) {
        return projectService.getProject(id, userDetails.getUsername())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> updateProject(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String id,
            @RequestBody CreateProjectRequest req
    ) {
        try {
            Project updated = projectService.updateProject(
                    id,
                    userDetails.getUsername(),
                    req.name(),
                    req.description(),
                    req.targetUrl(),
                    req.configurationJson()
            );
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProject(@AuthenticationPrincipal UserDetails userDetails, @PathVariable String id) {
        boolean deleted = projectService.deleteProject(id, userDetails.getUsername());
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }

    @PostMapping("/{id}/runs")
    public ResponseEntity<?> startTestRun(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String id,
            @RequestBody TestRunService.RunRequest req
    ) {
        try {
            TestRun run = testRunService.initiateRun(id, userDetails.getUsername(), req);
            return ResponseEntity.accepted().body(run);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
