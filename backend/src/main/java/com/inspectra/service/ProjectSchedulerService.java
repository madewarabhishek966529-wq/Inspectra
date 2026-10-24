package com.inspectra.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inspectra.model.Project;
import com.inspectra.repository.ProjectRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

@Service
public class ProjectSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(ProjectSchedulerService.class);

    private final ProjectRepository projectRepository;
    private final TestRunService testRunService;
    private final ObjectMapper objectMapper;

    public ProjectSchedulerService(
            ProjectRepository projectRepository,
            TestRunService testRunService,
            ObjectMapper objectMapper
    ) {
        this.projectRepository = projectRepository;
        this.testRunService = testRunService;
        this.objectMapper = objectMapper;
    }

    /**
     * Resolves human-friendly preset frequency names into standard 6-field Spring Cron Expressions.
     */
    public String resolveCronExpression(String frequency, String customCron) {
        if ("CUSTOM".equalsIgnoreCase(frequency)) {
            if (customCron == null || customCron.isBlank()) {
                throw new IllegalArgumentException("Custom cron expression must not be blank.");
            }
            return normalizeCron(customCron.trim());
        }

        if (frequency == null) {
            return "0 0 0 * * *"; // Default daily at midnight
        }

        return switch (frequency.toUpperCase()) {
            case "HOURLY" -> "0 0 * * * *";            // Top of every hour
            case "SIX_HOURS" -> "0 0 */6 * * *";       // Every 6 hours
            case "TWELVE_HOURS" -> "0 0 */12 * * *";   // Every 12 hours
            case "DAILY" -> "0 0 0 * * *";             // Daily at midnight UTC
            case "WEEKLY" -> "0 0 0 * * 1";            // Weekly on Monday midnight UTC
            default -> normalizeCron(frequency);
        };
    }

    /**
     * Converts standard 5-part cron (min hour dom mon dow) to Spring's 6-part cron (sec min hour dom mon dow)
     * if necessary.
     */
    public String normalizeCron(String cron) {
        String clean = cron.trim();
        String[] parts = clean.split("\\s+");
        if (parts.length == 5) {
            return "0 " + clean;
        } else if (parts.length == 6) {
            return clean;
        }
        throw new IllegalArgumentException("Cron expression must contain 5 or 6 fields. Received: " + cron);
    }

    /**
     * Computes the next execution Instant from a given cron expression.
     */
    public Instant calculateNextRun(String cron) {
        String normalized = normalizeCron(cron);
        CronExpression expression = CronExpression.parse(normalized);
        ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);
        ZonedDateTime next = expression.next(now);
        if (next == null) {
            throw new IllegalArgumentException("Cron expression does not produce any future execution times.");
        }
        return next.toInstant();
    }

    /**
     * Updates and activates or deactivates the autonomous schedule for a project.
     */
    public Project configureProjectSchedule(
            String projectId,
            String userId,
            Boolean enabled,
            String frequency,
            String customCron,
            String configurationJson
    ) {
        Project project = projectRepository.findByIdAndOwnerId(projectId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found or unauthorized."));

        boolean isEnabled = Boolean.TRUE.equals(enabled);
        project.setScheduleEnabled(isEnabled);

        if (isEnabled) {
            String cron = resolveCronExpression(frequency, customCron);
            project.setScheduleFrequency(frequency != null ? frequency.toUpperCase() : "DAILY");
            project.setScheduleCron(cron);

            Instant nextRun = calculateNextRun(cron);
            project.setNextRunAt(nextRun);
            log.info("Configured autonomous audit schedule for project {}: cron='{}', nextRunAt={}",
                    projectId, cron, nextRun);
        } else {
            project.setNextRunAt(null);
            log.info("Disabled autonomous schedule for project {}", projectId);
        }

        if (configurationJson != null) {
            project.setConfigurationJson(configurationJson);
        }
        project.setUpdatedAt(Instant.now());

        return projectRepository.save(project);
    }

    /**
     * Background daemon loop: checks every 30 seconds for projects due for autonomous audit execution.
     */
    @Scheduled(fixedDelay = 30000, initialDelay = 15000)
    public void executeScheduledAudits() {
        Instant now = Instant.now();
        List<Project> dueProjects = projectRepository.findByScheduleEnabledTrueAndNextRunAtLessThanEqual(now);

        if (dueProjects.isEmpty()) {
            return;
        }

        log.info("Found {} projects due for scheduled autonomous audit execution.", dueProjects.size());

        for (Project project : dueProjects) {
            try {
                dispatchAudit(project);
            } catch (Exception e) {
                log.error("Failed to execute scheduled audit for project {}: {}", project.getId(), e.getMessage(), e);
            }
        }
    }

    private void dispatchAudit(Project project) {
        log.info("Triggering scheduled autonomous audit for project {} ({})", project.getId(), project.getName());

        TestRunService.RunRequest runRequest = buildRunRequestFromConfig(project);

        try {
            testRunService.initiateRun(project.getId(), project.getOwnerId(), runRequest, "SCHEDULED");
        } finally {
            project.setLastScheduledRunAt(Instant.now());

            // Compute next execution instant
            try {
                if (project.getScheduleCron() != null) {
                    Instant next = calculateNextRun(project.getScheduleCron());
                    project.setNextRunAt(next);
                } else {
                    project.setNextRunAt(null);
                }
            } catch (Exception e) {
                log.warn("Could not calculate next run for project {}: {}", project.getId(), e.getMessage());
                project.setNextRunAt(Instant.now().plusSeconds(86400)); // Default to 24h fallback
            }

            projectRepository.save(project);
        }
    }

    private TestRunService.RunRequest buildRunRequestFromConfig(Project project) {
        List<String> categories = List.of("functional", "responsive", "accessibility", "seo", "console", "network");
        int maxPages = 15;
        boolean allowPrivate = true;

        if (project.getConfigurationJson() != null && !project.getConfigurationJson().isBlank()) {
            try {
                Map<?, ?> map = objectMapper.readValue(project.getConfigurationJson(), Map.class);
                if (map.containsKey("categories") && map.get("categories") instanceof List<?> list) {
                    categories = list.stream().map(Object::toString).toList();
                }
                if (map.containsKey("maxPages") && map.get("maxPages") instanceof Number n) {
                    maxPages = n.intValue();
                }
                if (map.containsKey("allowPrivateIps") && map.get("allowPrivateIps") instanceof Boolean b) {
                    allowPrivate = b;
                }
            } catch (Exception e) {
                log.debug("Using default configuration for project {}: {}", project.getId(), e.getMessage());
            }
        }

        return new TestRunService.RunRequest(
                project.getTargetUrl(),
                categories,
                null,
                maxPages,
                allowPrivate
        );
    }
}
