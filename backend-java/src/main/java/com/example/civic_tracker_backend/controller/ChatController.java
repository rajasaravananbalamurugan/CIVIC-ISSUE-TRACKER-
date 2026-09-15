package com.example.civic_tracker_backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    @PostMapping
    public ResponseEntity<?> handleChat(@RequestBody Map<String, List<Map<String, String>>> request) {
        // Stub for Groq AI chat integration
        return ResponseEntity.ok(Map.of("reply", "Hello from Java! AI Chat integration is currently a stub in the new backend."));
    }
}
