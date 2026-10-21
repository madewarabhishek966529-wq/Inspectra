package com.inspectra.ai;

import com.inspectra.model.Finding;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FailureAnalysisService {
    private static final Logger log = LoggerFactory.getLogger(FailureAnalysisService.class);

    private final OllamaClient ollamaClient;

    public FailureAnalysisService(OllamaClient ollamaClient) {
        this.ollamaClient = ollamaClient;
    }

    public void enrichFindingsWithAnalysis(List<Finding> findings) {
        if (findings == null || findings.isEmpty()) return;

        OllamaClient.OllamaHealth health = ollamaClient.checkHealth();
        boolean useAi = health.available();

        for (Finding finding : findings) {
            if (useAi && ("critical".equals(finding.getSeverity()) || "high".equals(finding.getSeverity()))) {
                OllamaClient.AiAnalysisResult aiResult = ollamaClient.analyzeDefect(
                        finding.getTitle(),
                        finding.getCategory(),
                        finding.getAffectedUrl(),
                        finding.getActualResult()
                );

                if (aiResult != null && aiResult.recommendedFix() != null && !aiResult.recommendedFix().isBlank()) {
                    finding.setSuggestedFix(aiResult.recommendedFix());
                    finding.setDescription(finding.getDescription() + " [AI Root Cause: " + aiResult.rootCause() + "]");
                    finding.setAiEnhanced(true);
                    continue;
                }
            }

            // Deterministic Rule-Based Fallback
            if (finding.getSuggestedFix() == null || finding.getSuggestedFix().isBlank()) {
                finding.setSuggestedFix(generateDeterministicFix(finding));
            }
            finding.setAiEnhanced(false);
        }
    }

    private String generateDeterministicFix(Finding finding) {
        String category = finding.getCategory();
        if ("accessibility".equalsIgnoreCase(category)) {
            return "Ensure all interactive elements have visible labels, images contain descriptive alt attributes, and text meets WCAG AA 4.5:1 contrast standards.";
        } else if ("responsive".equalsIgnoreCase(category)) {
            return "Apply CSS media queries or max-width: 100% on container elements to prevent viewport overflow across mobile breakpoints.";
        } else if ("seo".equalsIgnoreCase(category)) {
            return "Add necessary semantic meta tags (<title>, <meta name='description'>) and follow structured heading hierarchy.";
        } else if ("console".equalsIgnoreCase(category)) {
            return "Investigate JavaScript stack trace in browser developer tools and add defensive checks against undefined references.";
        } else if ("network".equalsIgnoreCase(category)) {
            return "Verify that target server endpoints are deployed and accessible without returning HTTP 4xx/5xx status codes.";
        }
        return "Review browser DOM structure and network requests to identify failing dependencies.";
    }
}
