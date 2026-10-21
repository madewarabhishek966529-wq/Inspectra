package com.inspectra.service;

import com.inspectra.model.Project;
import com.inspectra.repository.ProjectRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;

    public ProjectService(ProjectRepository projectRepository) {
        this.projectRepository = projectRepository;
    }

    public Project createProject(String ownerId, String name, String description, String targetUrl, String configJson) {
        String projectId = "prj-" + UUID.randomUUID().toString().substring(0, 12);
        Project project = new Project(projectId, ownerId, name, description, targetUrl, configJson);
        return projectRepository.save(project);
    }

    public List<Project> getProjectsForUser(String ownerId) {
        return projectRepository.findByOwnerIdOrderByCreatedAtDesc(ownerId);
    }

    public Optional<Project> getProject(String projectId, String ownerId) {
        return projectRepository.findByIdAndOwnerId(projectId, ownerId);
    }

    public Project updateProject(String projectId, String ownerId, String name, String description, String targetUrl, String configJson) {
        Project project = projectRepository.findByIdAndOwnerId(projectId, ownerId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found or unauthorized."));

        if (name != null && !name.isBlank()) project.setName(name);
        if (description != null) project.setDescription(description);
        if (targetUrl != null && !targetUrl.isBlank()) project.setTargetUrl(targetUrl);
        if (configJson != null) project.setConfigurationJson(configJson);
        project.setUpdatedAt(Instant.now());

        return projectRepository.save(project);
    }

    public boolean deleteProject(String projectId, String ownerId) {
        Optional<Project> project = projectRepository.findByIdAndOwnerId(projectId, ownerId);
        if (project.isPresent()) {
            projectRepository.delete(project.get());
            return true;
        }
        return false;
    }
}
