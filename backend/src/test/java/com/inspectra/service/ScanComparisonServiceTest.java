package com.inspectra.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.inspectra.model.Finding;
import com.inspectra.model.TestRun;
import com.inspectra.repository.FindingRepository;
import com.inspectra.repository.TestRunRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ScanComparisonServiceTest {

    @Mock
    private TestRunRepository testRunRepository;

    @Mock
    private FindingRepository findingRepository;

    private ScanComparisonService comparisonService;

    @BeforeEach
    void setUp() {
        comparisonService = new ScanComparisonService(testRunRepository, findingRepository, new ObjectMapper());
    }

    @Test
    void testCompareRunsDetectsNewResolvedAndPersistentFindings() {
        String baseId = "run-base";
        String targetId = "run-target";

        TestRun baseRun = new TestRun();
        baseRun.setId(baseId);
        baseRun.setTargetUrl("https://example.com");
        baseRun.setOverallScore(70);
        baseRun.setCreatedAt(Instant.now().minusSeconds(3600));

        TestRun targetRun = new TestRun();
        targetRun.setId(targetId);
        targetRun.setTargetUrl("https://example.com");
        targetRun.setOverallScore(85);
        targetRun.setCreatedAt(Instant.now());

        when(testRunRepository.findById(baseId)).thenReturn(Optional.of(baseRun));
        when(testRunRepository.findById(targetId)).thenReturn(Optional.of(targetRun));

        // Base findings: Finding A (persistent), Finding B (will be resolved)
        Finding findingA = createFinding(baseId, "accessibility", "Missing alt text", "https://example.com/about");
        Finding findingB = createFinding(baseId, "security", "Missing CSP", "https://example.com");
        when(findingRepository.findByTestRunId(baseId)).thenReturn(List.of(findingA, findingB));

        // Target findings: Finding A (persistent), Finding C (new regression)
        Finding findingANew = createFinding(targetId, "accessibility", "Missing alt text", "https://example.com/about");
        Finding findingC = createFinding(targetId, "performance", "High LCP", "https://example.com");
        when(findingRepository.findByTestRunId(targetId)).thenReturn(List.of(findingANew, findingC));

        ScanComparisonService.RunComparisonDto dto = comparisonService.compareRuns(baseId, targetId);

        assertNotNull(dto);
        assertEquals(baseId, dto.baseRunId());
        assertEquals(targetId, dto.targetRunId());
        assertEquals(15, dto.scoreDelta()); // 85 - 70 = +15

        assertEquals(1, dto.totalNewFindings());
        assertEquals("High LCP", dto.newFindings().get(0).getTitle());

        assertEquals(1, dto.totalResolvedFindings());
        assertEquals("Missing CSP", dto.resolvedFindings().get(0).getTitle());

        assertEquals(1, dto.totalPersistentFindings());
        assertEquals("Missing alt text", dto.persistentFindings().get(0).getTitle());
    }
    
    @Test
    void testCompareRunsThrowsWhenRunNotFound() {
        when(testRunRepository.findById("non-existent")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () -> comparisonService.compareRuns("non-existent", "run-2"));
    }

    private Finding createFinding(String runId, String category, String title, String url) {
        Finding f = new Finding();
        f.setTestRunId(runId);
        f.setCategory(category);
        f.setTitle(title);
        f.setAffectedUrl(url);
        f.setSeverity("HIGH");
        return f;
    }
}
