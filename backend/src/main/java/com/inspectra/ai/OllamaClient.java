package com.inspectra.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class OllamaClient {
    private static final Logger log = LoggerFactory.getLogger(OllamaClient.class);

    @Value("${inspectra.ollama.base-url:http://localhost:11434}")
    private String baseUrl;

    @Value("${inspectra.ollama.model:llama3.2}")
    private String defaultModel;

    @Value("${inspectra.ollama.timeout-ms:30000}")
    private long timeoutMs;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public OllamaClient(ObjectMapper objectMapper) {
        this.webClient = WebClient.builder().build();
        this.objectMapper = objectMapper;
    }

    public record OllamaHealth(boolean available, String baseUrl, String configuredModel, List<String> availableModels, String message) {}

    public OllamaHealth checkHealth() {
        try {
            JsonNode resp = webClient.get()
                    .uri(baseUrl + "/api/tags")
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .timeout(Duration.ofMillis(3000))
                    .block();

            List<String> models = new ArrayList<>();
            if (resp != null && resp.has("models")) {
                for (JsonNode m : resp.get("models")) {
                    if (m.has("name")) {
                        models.add(m.get("name").asText());
                    }
                }
            }

            return new OllamaHealth(true, baseUrl, defaultModel, models, "Ollama service connected successfully.");
        } catch (Exception e) {
            return new OllamaHealth(false, baseUrl, defaultModel, List.of(), "Ollama unreachable at " + baseUrl + ": " + e.getMessage());
        }
    }

    public record AiAnalysisResult(String rootCause, String recommendedFix, String confidenceRationale) {}

    public AiAnalysisResult analyzeDefect(String findingTitle, String category, String affectedUrl, String actualOutcome) {
        try {
            String prompt = String.format("""
                You are Inspectra AI, a Senior QA Engineer and Root Cause Analyst.
                Analyze the following verified browser test defect:
                - Finding: %s
                - Category: %s
                - Affected URL: %s
                - Observed Outcome: %s

                Respond with ONLY a valid JSON object matching this schema:
                {
                  "rootCause": "Clear explanation of the technical reason behind this failure",
                  "recommendedFix": "Concrete engineering instructions or code pattern to fix this issue",
                  "confidenceRationale": "Why this explanation is backed by the evidence"
                }
                """, findingTitle, category, affectedUrl, actualOutcome);

            Map<String, Object> body = Map.of(
                    "model", defaultModel,
                    "prompt", prompt,
                    "stream", false,
                    "format", "json"
            );

            JsonNode resp = webClient.post()
                    .uri(baseUrl + "/api/generate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .timeout(Duration.ofMillis(timeoutMs))
                    .block();

            if (resp != null && resp.has("response")) {
                String rawText = resp.get("response").asText();
                JsonNode parsed = objectMapper.readTree(rawText);
                return new AiAnalysisResult(
                        parsed.path("rootCause").asText("Potential implementation or configuration issue."),
                        parsed.path("recommendedFix").asText("Inspect browser console logs and verify element implementation."),
                        parsed.path("confidenceRationale").asText("Derived from execution telemetry.")
                );
            }
        } catch (Exception e) {
            log.warn("Ollama AI inference unavailable or timed out: {}", e.getMessage());
        }

        return null; // Signals to use deterministic fallback
    }

    public String getBaseUrl() { return baseUrl; }
    public String getDefaultModel() { return defaultModel; }
}
