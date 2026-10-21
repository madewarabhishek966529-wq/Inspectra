package com.inspectra.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class SseBroadcaster {
    private static final Logger log = LoggerFactory.getLogger(SseBroadcaster.class);
    private final Map<String, CopyOnWriteArrayList<SseEmitter>> emittersMap = new ConcurrentHashMap<>();

    public SseEmitter subscribe(String runId) {
        SseEmitter emitter = new SseEmitter(10 * 60 * 1000L); // 10 min timeout
        emittersMap.computeIfAbsent(runId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeEmitter(runId, emitter));
        emitter.onTimeout(() -> removeEmitter(runId, emitter));
        emitter.onError(e -> removeEmitter(runId, emitter));

        try {
            emitter.send(SseEmitter.event().name("INIT").data("Connected to Inspectra Live Run Stream for " + runId));
        } catch (IOException e) {
            removeEmitter(runId, emitter);
        }

        return emitter;
    }

    public void broadcast(String runId, Object event) {
        CopyOnWriteArrayList<SseEmitter> emitters = emittersMap.get(runId);
        if (emitters == null || emitters.isEmpty()) return;

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("RUN_EVENT").data(event));
            } catch (Exception e) {
                removeEmitter(runId, emitter);
            }
        }
    }

    private void removeEmitter(String runId, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> list = emittersMap.get(runId);
        if (list != null) {
            list.remove(emitter);
            if (list.isEmpty()) {
                emittersMap.remove(runId);
            }
        }
    }
}
