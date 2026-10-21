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
}
