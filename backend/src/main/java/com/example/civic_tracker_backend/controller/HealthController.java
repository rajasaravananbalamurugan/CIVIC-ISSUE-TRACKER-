package com.example.civic_tracker_backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/")
    public ResponseEntity<?> root() {
        return ResponseEntity.ok(Map.of("status", "OK", "message", "Civic Tracker API is running (Java/Spring Boot)"));
    }

    @GetMapping("/api/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of("status", "OK", "message", "Civic Tracker API is running (Java/Spring Boot)"));
    }
}
