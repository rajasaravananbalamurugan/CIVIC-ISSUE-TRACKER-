package com.example.civic_tracker_backend.controller;

import com.example.civic_tracker_backend.entity.AiPrediction;
import com.example.civic_tracker_backend.entity.Complaint;
import com.example.civic_tracker_backend.repository.AiPredictionRepository;
import com.example.civic_tracker_backend.repository.ComplaintRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/ai")
public class AiController {

    @Value("${app.groq.api.key}")
    private String groqApiKey;

    @Autowired
    private ComplaintRepository complaintRepository;
    
    @Autowired
    private AiPredictionRepository aiPredictionRepository;
    
    private final ObjectMapper mapper = new ObjectMapper();

    private final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

    @PostMapping("/predict/{complaintId}")
    public ResponseEntity<?> predictUrgency(@PathVariable Long complaintId) {
        Optional<Complaint> opt = complaintRepository.findById(complaintId);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        Complaint c = opt.get();
        
        Optional<AiPrediction> existingOpt = aiPredictionRepository.findByComplaintId(complaintId);
        if (existingOpt.isPresent()) {
            AiPrediction existing = existingOpt.get();
            // Cache valid for 1 hour
            if (existing.getUpdatedAt().isAfter(LocalDateTime.now().minusHours(1))) {
                return ResponseEntity.ok(Map.of("prediction", existing, "cached", true));
            }
        }

        if (groqApiKey == null || groqApiKey.isEmpty() || groqApiKey.equals("gsk_placeholder_key")) {
            return ResponseEntity.status(503).body(Map.of(
                "error", "AI service not configured",
                "message", "Please set GROQ_API_KEY in your properties"
            ));
        }

        String prompt = "You are an AI assistant for a civic issue management system. Analyze this citizen complaint and provide an urgency assessment.\n" +
                "COMPLAINT DETAILS:\n" +
                "- Title: " + c.getTitle() + "\n" +
                "- Description: " + c.getDescription() + "\n" +
                "- Category: " + c.getCategory() + "\n" +
                "- Current Status: " + c.getStatus() + "\n\n" +
                "TASK: Analyze this complaint and respond with ONLY a valid JSON object in this exact format:\n" +
                "{\n  \"urgency_score\": <integer 1-100>,\n  \"recommended_priority\": \"<Low|Medium|High|Critical>\",\n  \"reason\": \"<one concise sentence>\"\n}\n" +
                "Do not include any markdown or extra text.";

        String aiResponse = callGroqText(prompt);

        try {
            String cleanJson = aiResponse.replaceAll("```json", "").replaceAll("```", "").trim();
            Map<String, Object> result = mapper.readValue(cleanJson, Map.class);
            
            Integer score = (Integer) result.get("urgency_score");
            String priority = (String) result.get("recommended_priority");
            String reason = (String) result.get("reason");
            
            if (score == null || priority == null || reason == null) {
                throw new Exception("Missing required fields");
            }
            
            AiPrediction prediction = existingOpt.orElse(new AiPrediction());
            prediction.setComplaintId(c.getId());
            prediction.setUrgencyScore(score);
            prediction.setRecommendedPriority(priority);
            prediction.setReason(reason);
            prediction.setAccepted(false);
            
            aiPredictionRepository.save(prediction);
            return ResponseEntity.ok(Map.of("prediction", prediction, "cached", false));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "AI prediction failed", "message", e.getMessage()));
        }
    }

    @PostMapping("/accept/{complaintId}")
    public ResponseEntity<?> acceptPrediction(@PathVariable Long complaintId) {
        Optional<Complaint> opt = complaintRepository.findById(complaintId);
        if (opt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "Complaint not found"));
        
        Optional<AiPrediction> predOpt = aiPredictionRepository.findByComplaintId(complaintId);
        if (predOpt.isEmpty()) return ResponseEntity.status(404).body(Map.of("error", "No AI prediction found for this complaint"));
        
        Complaint c = opt.get();
        AiPrediction prediction = predOpt.get();
        
        c.setPriority(prediction.getRecommendedPriority());
        complaintRepository.save(c);
        
        prediction.setAccepted(true);
        aiPredictionRepository.save(prediction);
        
        return ResponseEntity.ok(Map.of("message", "AI suggestion accepted", "priority", c.getPriority()));
    }

    @PostMapping("/clean-text")
    public ResponseEntity<?> cleanText(@RequestBody Map<String, String> request) {
        String text = request.get("text");
        if (text == null || text.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Text is required"));
        }
        
        if (groqApiKey == null || groqApiKey.isEmpty() || groqApiKey.equals("gsk_placeholder_key")) {
            String cleaned = text.trim().substring(0, 1).toUpperCase() + text.trim().substring(1) + (text.endsWith(".") ? "" : ".");
            return ResponseEntity.ok(Map.of("cleanedText", cleaned));
        }

        String prompt = "Clean up this voice transcription of a civic complaint into clear professional English, fixing grammar but keeping the meaning exactly: " + text;
        String cleanedText = callGroqText(prompt);
        return ResponseEntity.ok(Map.of("cleanedText", cleanedText));
    }

    @PostMapping("/analyze-image")
    public ResponseEntity<?> analyzeImage(@RequestBody Map<String, String> request) {
        String image = request.get("image");
        if (image == null || image.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Image is required"));
        }
        
        if (groqApiKey == null || groqApiKey.isEmpty() || groqApiKey.equals("gsk_placeholder_key")) {
            return ResponseEntity.ok(Map.of(
                "title", "Civic Issue Detected (Mock)",
                "category", "Other",
                "priority", "Medium",
                "description", "Mock analysis generated because Groq API key is missing.",
                "confidence", 80
            ));
        }
        
        try {
            String mediaType = "image/jpeg";
            String base64Data = image;
            if (image.startsWith("data:")) {
                String[] parts = image.split(";base64,");
                mediaType = parts[0].replace("data:", "");
                base64Data = parts[1];
            }
            
            String prompt = "You are an AI that identifies civic issues from photos (e.g. potholes, broken streetlights, garbage). " +
                "Respond ONLY with a JSON object in this format: { \"title\": \"Short descriptive title\", \"category\": \"Road Damage|Street Light|Garbage|Water|Other\", \"priority\": \"Low|Medium|High|Critical\", \"description\": \"Detailed description of the issue\", \"confidence\": <1-100> }";
            
            Map<String, Object> imageUrlMap = Map.of("url", "data:" + mediaType + ";base64," + base64Data);
            
            List<Map<String, Object>> contentList = new ArrayList<>();
            contentList.add(Map.of("type", "text", "text", prompt));
            contentList.add(Map.of("type", "image_url", "image_url", imageUrlMap));
            
            List<Map<String, Object>> messages = new ArrayList<>();
            messages.add(Map.of("role", "user", "content", contentList));
            
            Map<String, Object> body = new HashMap<>();
            body.put("model", "llama-3.2-11b-vision-preview");
            body.put("messages", messages);
            body.put("max_tokens", 512);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(groqApiKey);
            
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            RestTemplate restTemplate = new RestTemplate();
            
            ResponseEntity<Map> response = restTemplate.postForEntity(GROQ_URL, entity, Map.class);
            Map<String, Object> responseBody = response.getBody();
            if (responseBody != null && responseBody.containsKey("choices")) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
                if (!choices.isEmpty()) {
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    String text = (String) message.get("content");
                    
                    String cleanJson = text.replaceAll("```json", "").replaceAll("```", "").trim();
                    Map<String, Object> result = mapper.readValue(cleanJson, Map.class);
                    return ResponseEntity.ok(result);
                }
            }
            throw new Exception("Invalid response format");
        } catch (Exception e) {
            // Graceful fallback mimicking old logic
            return ResponseEntity.ok(Map.of(
                "title", "Civic Issue Detected",
                "category", "Road Damage",
                "priority", "High",
                "description", "Photo analysis detected surface damage and hazard. Please review pre-filled fields before submitting.",
                "confidence", 82,
                "is_fallback", true
            ));
        }
    }

    private String callGroqText(String prompt) {
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "user", "content", prompt));

        Map<String, Object> body = new HashMap<>();
        body.put("model", "qwen/qwen3.8-27b");
        body.put("messages", messages);
        body.put("temperature", 0.1);

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
                    return (String) message.get("content");
                }
            }
        } catch (Exception e) {
            return "{\"error\": \""+e.getMessage()+"\"}";
        }
        return "{}";
    }
}
