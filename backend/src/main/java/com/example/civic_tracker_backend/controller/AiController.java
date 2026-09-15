package com.example.civic_tracker_backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    @PostMapping("/predict/{complaintId}")
    public ResponseEntity<?> predictUrgency(@PathVariable Long complaintId) {
        // Stub for Groq AI urgency prediction
        return ResponseEntity.ok(Map.of(
            "urgency_score", 5,
            "recommended_priority", "Medium",
            "reason", "Java backend stub reason"
        ));
    }

    @PostMapping("/analyze-image")
    public ResponseEntity<?> analyzeImage() {
        return ResponseEntity.ok(Map.of("summary", "Image analyzed (stub)", "category", "Other"));
    }
}
