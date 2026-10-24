package com.inspectra;

import com.inspectra.model.Project;
import com.inspectra.security.TargetUrlSecurityValidator;
import com.inspectra.service.AuthService;
import com.inspectra.service.ProjectService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class InspectraApplicationTests {

    @Autowired
    private AuthService authService;

    @Autowired
    private ProjectService projectService;

    @Autowired
    private TargetUrlSecurityValidator urlValidator;

    @Test
    void contextLoads() {
        assertNotNull(authService);
        assertNotNull(projectService);
        assertNotNull(urlValidator);
    }

    @Test
    void testAuthWorkflow() {
        String testEmail = "engineer_" + System.currentTimeMillis() + "@inspectra.ai";
        AuthService.AuthResponse res = authService.register(testEmail, "SecureP@ss123");
        assertNotNull(res.token());
        assertEquals(testEmail, res.email());

        AuthService.AuthResponse loginRes = authService.login(testEmail, "SecureP@ss123");
        assertNotNull(loginRes.token());
        assertEquals(res.userId(), loginRes.userId());
    }

    @Test
    void testProjectOwnership() {
        String userId = "usr-test-" + System.currentTimeMillis();
        Project p = projectService.createProject(userId, "E-Commerce QA", "Automated QA", "https://example.com", null);
        assertNotNull(p.getId());

        // Same user can retrieve
        assertTrue(projectService.getProject(p.getId(), userId).isPresent());

        // Different user cannot access
        assertTrue(projectService.getProject(p.getId(), "unauthorized-user").isEmpty());
    }

    @Autowired
    private com.inspectra.service.ProjectSchedulerService schedulerService;

    @Autowired
    private com.inspectra.service.ProjectTrendService trendService;

    @Test
    void testSsrfProtection() {
        // Metadata endpoint must be blocked
        var metaRes = urlValidator.validate("http://169.254.169.254/latest/meta-data", false);
        assertFalse(metaRes.safe());

        // Private loopback blocked when allowPrivateIps is false
        var loopbackRes = urlValidator.validate("http://127.0.0.1:8080", false);
        assertFalse(loopbackRes.safe());

        // Public domain allowed
        var publicRes = urlValidator.validate("https://google.com", false);
        assertTrue(publicRes.safe());
    }

    @Test
    void testSchedulerFrequencyResolution() {
        assertNotNull(schedulerService);
        assertEquals("0 0 * * * *", schedulerService.resolveCronExpression("HOURLY", null));
        assertEquals("0 0 */6 * * *", schedulerService.resolveCronExpression("SIX_HOURS", null));
        assertEquals("0 0 0 * * *", schedulerService.resolveCronExpression("DAILY", null));
        assertEquals("0 0 0 * * 1", schedulerService.resolveCronExpression("WEEKLY", null));

        // 5-part cron normalized to 6-part
        assertEquals("0 */15 * * * *", schedulerService.resolveCronExpression("CUSTOM", "*/15 * * * *"));

        // Next run should be in the future
        java.time.Instant nextRun = schedulerService.calculateNextRun("0 0 0 * * *");
        assertNotNull(nextRun);
        assertTrue(nextRun.isAfter(java.time.Instant.now()));
    }

    @Test
    void testProjectTrendsComputation() {
        String userId = "usr-trend-" + System.currentTimeMillis();
        Project p = projectService.createProject(userId, "Trend Portal", "Trend test", "https://example.com", null);

        var trends = trendService.getProjectTrends(p.getId(), userId);
        assertNotNull(trends);
        assertEquals(p.getId(), trends.projectId());
        assertEquals("Trend Portal", trends.projectName());
        assertEquals(0, trends.totalRuns());
        assertNotNull(trends.history());
    }
}

