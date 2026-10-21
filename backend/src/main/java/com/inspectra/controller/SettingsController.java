package com.inspectra.controller;

import com.inspectra.ai.OllamaClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class SettingsController {

    private final OllamaClient ollamaClient;
    private final WebClient webClient;

    @Value("${inspectra.worker.base-url:http://localhost:5001}")
    private String workerBaseUrl;

    public SettingsController(OllamaClient ollamaClient) {
        this.ollamaClient = ollamaClient;
        this.webClient = WebClient.builder().build();
    }

    @GetMapping("/settings/ai")
    public ResponseEntity<OllamaClient.OllamaHealth> getAiSettings() {
        return ResponseEntity.ok(ollamaClient.checkHealth());
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getSystemHealth() {
        Map<String, Object> health = new HashMap<>();
        health.put("backend", "UP");
        health.put("version", "1.0.0");
        health.put("service", "Inspectra AI Orchestration Backend");

        // Worker check
        try {
            Map<?, ?> workerHealth = webClient.get()
                    .uri(workerBaseUrl + "/health")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofMillis(2000))
                    .block();
            health.put("worker", workerHealth != null ? "CONNECTED" : "UNREACHABLE");
        } catch (Exception e) {
            health.put("worker", "OFFLINE (" + e.getMessage() + ")");
        }

        // AI check
        OllamaClient.OllamaHealth aiHealth = ollamaClient.checkHealth();
        health.put("ai", aiHealth.available() ? "ONLINE (" + aiHealth.configuredModel() + ")" : "OFFLINE (Deterministic Fallback Active)");

        return ResponseEntity.ok(health);
    }
}
