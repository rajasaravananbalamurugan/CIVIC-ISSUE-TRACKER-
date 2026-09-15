package com.example.civic_tracker_backend.controller;

import com.example.civic_tracker_backend.entity.Complaint;
import com.example.civic_tracker_backend.entity.User;
import com.example.civic_tracker_backend.repository.ComplaintRepository;
import com.example.civic_tracker_backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    @Value("${app.groq.api.key}")
    private String groqApiKey;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ComplaintRepository complaintRepository;

    private final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

    @PostMapping
    public ResponseEntity<?> handleChat(
            @RequestAttribute(value = "userId", required = false) Long userId,
            @RequestBody Map<String, List<Map<String, String>>> request) {

        List<Map<String, String>> userMessages = request.get("messages");
        if (userMessages == null || userMessages.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Messages array is required"));
        }

        // Determine citizen details
        String userName = "Citizen";
        String userWard = "Ward 1";
        List<Complaint> userComplaints = new ArrayList<>();

        if (userId != null) {
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isPresent()) {
                User u = userOpt.get();
                if (u.getName() != null && !u.getName().isEmpty()) userName = u.getName();
                if (u.getWard() != null && !u.getWard().isEmpty()) userWard = u.getWard();
            }
            userComplaints = complaintRepository.findByCitizenId(userId);
        } else {
            // If called without auth token, default to first citizen complaints for demo
            List<Complaint> all = complaintRepository.findAll();
            if (!all.isEmpty()) {
                userComplaints = all.subList(0, Math.min(5, all.size()));
            }
        }

        // Format complaints history context
        StringBuilder complaintsContext = new StringBuilder();
        if (userComplaints.isEmpty()) {
            complaintsContext.append("No complaints filed yet by this citizen.");
        } else {
            for (Complaint c : userComplaints) {
                complaintsContext.append("- [").append(c.getComplaintId() != null ? c.getComplaintId() : "CMP-" + c.getId()).append("] \"")
                        .append(c.getTitle()).append("\" | Category: ").append(c.getCategory())
                        .append(" | Status: ").append(c.getStatus())
                        .append(" | Priority: ").append(c.getPriority())
                        .append(" | Address: ").append(c.getAddress() != null ? c.getAddress() : "N/A")
                        .append(" | Ward: ").append(c.getWard() != null ? c.getWard() : userWard)
                        .append(" | Filed: ").append(c.getCreatedAt())
                        .append(" | SLA: ").append(c.getSlaDays() != null ? c.getSlaDays() : 7).append(" days")
                        .append(" | Resolution Note: ").append(c.getResolutionNote() != null ? c.getResolutionNote() : "None")
                        .append(" | Upvotes: ").append(c.getUpvoteCount() != null ? c.getUpvoteCount() : 0)
                        .append("\n");
            }
        }

        String systemPrompt = "You are CivicBot, an intelligent and helpful AI Civic Assistant for the CivicTracker platform.\n" +
                "You are assisting citizen: " + userName + " (Ward: " + userWard + ").\n\n" +
                "SYSTEM CONTEXT & CATEGORY SLAs:\n" +
                "- Pothole: 7 days SLA\n" +
                "- Garbage: 3 days SLA\n" +
                "- Streetlight: 5 days SLA\n" +
                "- Water Supply: 2 days SLA\n" +
                "- Others: 7 days SLA\n\n" +
                "CITIZEN'S FILED COMPLAINTS HISTORY:\n" +
                complaintsContext + "\n\n" +
                "YOUR CAPABILITIES & INSTRUCTIONS:\n" +
                "1. Answer citizen queries about their specific complaints (e.g. status, ID, estimated resolution time based on category SLA and filing date).\n" +
                "2. Explain how CivicTracker works (statuses: Pending → In Progress → Resolved / Rejected).\n" +
                "3. Provide general civic help and advice on how to report issues, upvote community issues, and earn civic badges.\n" +
                "4. Be polite, concise, encouraging, and clear. Format responses with markdown bullet points or bold text when helpful.\n" +
                "5. When the user asks about the status of their complaints, always list each of their complaints clearly with ID, Title, Status, and SLA details.";

        if (groqApiKey == null || groqApiKey.isEmpty() || groqApiKey.equals("gsk_placeholder_key")) {
            // Intelligent fallback mode when API key is missing
            String lastMsg = userMessages.get(userMessages.size() - 1).getOrDefault("content", "").toLowerCase();
            String fallbackReply;
            if (lastMsg.contains("status") || lastMsg.contains("complaint")) {
                if (!userComplaints.isEmpty()) {
                    Complaint latest = userComplaints.get(0);
                    fallbackReply = "Hello " + userName + "! You have " + userComplaints.size() + " complaint(s) on file.\n\n" +
                            "Your latest complaint **" + latest.getComplaintId() + "** (\"" + latest.getTitle() + "\") is currently **" + latest.getStatus() + "** with **" + latest.getPriority() + "** priority (SLA: " + latest.getSlaDays() + " days).";
                } else {
                    fallbackReply = "Hello " + userName + "! You haven't filed any complaints yet. You can click 'File Complaint' in the navigation menu to report an issue!";
                }
            } else {
                fallbackReply = "Hello " + userName + "! I am CivicBot. I can help track your complaints, explain category SLAs, and guide you on city services.";
            }
            return ResponseEntity.ok(Map.of("reply", fallbackReply));
        }

        List<Map<String, String>> fullMessages = new ArrayList<>();
        fullMessages.add(Map.of("role", "system", "content", systemPrompt));
        for (Map<String, String> m : userMessages) {
            String role = "assistant".equalsIgnoreCase(m.get("role")) ? "assistant" : "user";
            fullMessages.add(Map.of("role", role, "content", m.getOrDefault("content", "")));
        }

        Map<String, Object> body = new HashMap<>();
        body.put("model", "qwen/qwen3.8-27b");
        body.put("messages", fullMessages);
        body.put("temperature", 0.6);
        body.put("max_tokens", 800);

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
