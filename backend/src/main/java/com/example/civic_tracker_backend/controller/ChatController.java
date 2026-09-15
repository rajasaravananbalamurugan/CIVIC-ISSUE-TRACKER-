package com.example.civic_tracker_backend.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    @Value("${app.groq.api.key}")
    private String groqApiKey;

    private final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

    @PostMapping
    public ResponseEntity<?> handleChat(@RequestBody Map<String, List<Map<String, String>>> request) {
        if (groqApiKey == null || groqApiKey.isEmpty() || groqApiKey.equals("gsk_placeholder_key")) {
            return ResponseEntity.status(400).body(Map.of(
                "message", "GROQ_API_KEY is not configured in backend. Please set the environment variable."
            ));
        }

        List<Map<String, String>> userMessages = request.get("messages");
        if (userMessages == null) {
            userMessages = new ArrayList<>();
        }

        List<Map<String, String>> fullMessages = new ArrayList<>();
        fullMessages.add(Map.of(
            "role", "system",
            "content", "You are CivicBot, a helpful assistant for a civic issue reporting platform. You help citizens track their complaints, explain SLAs, and understand how to earn civic badges. Keep your answers concise, helpful, and friendly. Do not use markdown headers unless necessary."
        ));
        fullMessages.addAll(userMessages);

        Map<String, Object> body = new HashMap<>();
        body.put("model", "qwen/qwen3.8-27b");
        body.put("messages", fullMessages);
        body.put("temperature", 0.7);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(groqApiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        RestTemplate restTemplate = new RestTemplate();

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(GROQ_URL, entity, Map.class);
            Map<String, Object> responseBody = response.getBody();
            if (responseBody != null && responseBody.containsKey("choices")) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
                if (!choices.isEmpty()) {
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    String reply = (String) message.get("content");
                    return ResponseEntity.ok(Map.of("reply", reply));
                }
            }
            return ResponseEntity.status(500).body(Map.of("message", "Invalid response from Groq API"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Failed to communicate with Groq: " + e.getMessage()));
        }
    }
}
