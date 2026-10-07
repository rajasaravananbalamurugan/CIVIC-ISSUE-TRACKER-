package com.example.civic_tracker_backend.controller;

import com.example.civic_tracker_backend.entity.Complaint;
import com.example.civic_tracker_backend.entity.Notification;
import com.example.civic_tracker_backend.entity.StatusHistory;
import com.example.civic_tracker_backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {

    @Autowired private ComplaintRepository complaintRepository;
    @Autowired private CommentRepository commentRepository;
    @Autowired private StatusHistoryRepository statusHistoryRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private UserRepository userRepository;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    private String saveFile(MultipartFile file) {
        if (file == null || file.isEmpty()) return null;
        try {
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            String ext = "";
            String original = file.getOriginalFilename();
            if (original != null && original.contains(".")) {
                ext = original.substring(original.lastIndexOf('.'));
            }
            String filename = "complaint_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 6) + ext;
            Path filePath = uploadPath.resolve(filename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/" + filename;
        } catch (IOException e) {
            System.err.println("Failed to save uploaded file: " + e.getMessage());
            return null;
        }
    }

    private static final Map<String, Integer> SLA_DAYS = Map.of(
            "Pothole", 7, "Garbage", 3, "Streetlight", 5, "Water Supply", 2
    );

    private int getSlaDays(String category) {
        return SLA_DAYS.getOrDefault(category, 7);
    }

    private long getDaysOverdue(Complaint c) {
        if ("Resolved".equals(c.getStatus()) || "Rejected".equals(c.getStatus())) return 0;
        int sla = c.getSlaDays() != null ? c.getSlaDays() : 7;
        long daysSince = java.time.temporal.ChronoUnit.DAYS.between(c.getCreatedAt(), LocalDateTime.now());
        return Math.max(0, daysSince - sla);
    }

    private Map<String, Object> enrichComplaint(Complaint c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId());
        m.put("complaint_id", c.getComplaintId());
        m.put("citizen_id", c.getCitizenId());
        m.put("title", c.getTitle());
        m.put("description", c.getDescription());
        m.put("category", c.getCategory());
        m.put("status", c.getStatus());
        m.put("priority", c.getPriority());
        m.put("address", c.getAddress());
        m.put("ward", c.getWard());
        m.put("latitude", c.getLatitude());
        m.put("longitude", c.getLongitude());
        m.put("image_url", c.getImageUrl());
        m.put("after_image_url", c.getAfterImageUrl());
        m.put("assigned_to", c.getAssignedTo());
        m.put("resolution_note", c.getResolutionNote());
        m.put("resolved_at", c.getResolvedAt());
        m.put("created_at", c.getCreatedAt());
        m.put("updated_at", c.getUpdatedAt());
        m.put("upvote_count", c.getUpvoteCount() != null ? c.getUpvoteCount() : 0);
        m.put("sla_days", c.getSlaDays() != null ? c.getSlaDays() : 7);
        m.put("is_escalated", c.getIsEscalated() != null ? c.getIsEscalated() : 0);
        m.put("days_overdue", getDaysOverdue(c));
        m.put("is_overdue", getDaysOverdue(c) > 0 ? 1 : 0);
        // Enrich with citizen name if available
        userRepository.findById(c.getCitizenId()).ifPresent(u -> {
            m.put("citizen_name", u.getName());
            m.put("citizen_email", u.getEmail());
        });
        if (c.getAssignedTo() != null) {
            userRepository.findById(c.getAssignedTo()).ifPresent(u -> m.put("assigned_to_name", u.getName()));
        }
        return m;
    }

    // ── GET /api/complaints ───────────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<?> getAllComplaints(
            @RequestAttribute("userId") Long userId,
            @RequestAttribute("userRole") String userRole,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String ward,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit) {

        List<Complaint> all = complaintRepository.findAll();

        List<Complaint> filtered = all.stream()
                .filter(c -> !"citizen".equals(userRole) || userId.equals(c.getCitizenId()))
                .filter(c -> status == null || status.equals(c.getStatus()))
                .filter(c -> category == null || category.equals(c.getCategory()))
                .filter(c -> priority == null || priority.equals(c.getPriority()))
                .filter(c -> ward == null || ward.equals(c.getWard()))
                .filter(c -> search == null || c.getTitle().toLowerCase().contains(search.toLowerCase())
                        || c.getDescription().toLowerCase().contains(search.toLowerCase())
                        || c.getComplaintId().toLowerCase().contains(search.toLowerCase()))
                .sorted(Comparator.comparingInt((Complaint c) -> -(c.getUpvoteCount() != null ? c.getUpvoteCount() : 0))
                        .thenComparing(Comparator.comparing(Complaint::getCreatedAt).reversed()))
                .collect(Collectors.toList());

        int total = filtered.size();
        int offset = (page - 1) * limit;
        List<Map<String, Object>> paginated = filtered.stream().skip(offset).limit(limit)
                .map(this::enrichComplaint).collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
                "complaints", paginated,
                "pagination", Map.of("total", total, "page", page, "limit", limit, "totalPages", (int)Math.ceil((double)total / limit))
        ));
    }

    private ResponseEntity<?> processAndSaveComplaint(Complaint complaint, Long userId) {
        if (complaint.getTitle() == null || complaint.getTitle().trim().isEmpty() ||
            complaint.getDescription() == null || complaint.getDescription().trim().isEmpty() ||
            complaint.getCategory() == null || complaint.getCategory().trim().isEmpty() ||
            complaint.getAddress() == null || complaint.getAddress().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Please fill all required fields (title, description, category, address)."));
        }

        complaint.setCitizenId(userId);
        complaint.setComplaintId("CMP-" + java.time.Year.now().getValue() + "-" + String.format("%04d", complaintRepository.count() + 1));
        complaint.setCreatedAt(LocalDateTime.now());
        complaint.setUpdatedAt(LocalDateTime.now());
        complaint.setStatus("Pending");
        complaint.setSlaDays(getSlaDays(complaint.getCategory()));
        if (complaint.getPriority() == null || complaint.getPriority().trim().isEmpty()) {
            complaint.setPriority("Medium");
        }
        Complaint saved = complaintRepository.save(complaint);

        // Create initial status history entry
        StatusHistory history = new StatusHistory();
        history.setComplaintId(saved.getId());
        history.setNewStatus("Pending");
        history.setChangedBy(userId);
        history.setNote("Complaint filed");
        statusHistoryRepository.save(history);

        // Self-notification
        Notification notif = new Notification();
        notif.setUserId(userId);
        notif.setComplaintId(saved.getId());
        notif.setComplaintRef(saved.getComplaintId());
        notif.setMessage("Your complaint " + saved.getComplaintId() + " has been filed. SLA: " + saved.getSlaDays() + " days.");
        notificationRepository.save(notif);

        return ResponseEntity.status(201).body(Map.of("message", "Complaint filed successfully", "complaint", enrichComplaint(saved)));
    }

    // ── POST /api/complaints ──────────────────────────────────────────────────
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> createComplaintJson(@RequestBody Complaint complaint, @RequestAttribute("userId") Long userId) {
        return processAndSaveComplaint(complaint, userId);
    }

    @PostMapping(consumes = { MediaType.MULTIPART_FORM_DATA_VALUE, MediaType.APPLICATION_FORM_URLENCODED_VALUE })
    public ResponseEntity<?> createComplaintMultipart(
            @RequestParam("title") String title,
            @RequestParam("description") String description,
            @RequestParam("category") String category,
            @RequestParam(value = "priority", required = false, defaultValue = "Medium") String priority,
            @RequestParam("address") String address,
            @RequestParam(value = "ward", required = false) String ward,
            @RequestParam(value = "latitude", required = false) String latitude,
            @RequestParam(value = "longitude", required = false) String longitude,
            @RequestParam(value = "image", required = false) MultipartFile image,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "imageUrl", required = false) String imageUrl,
            @RequestParam(value = "image_url", required = false) String imageUrlUnderscore,
            @RequestAttribute("userId") Long userId) {

        Complaint complaint = new Complaint();
        complaint.setTitle(title);
        complaint.setDescription(description);
        complaint.setCategory(category);
        complaint.setPriority(priority != null && !priority.trim().isEmpty() ? priority : "Medium");
        complaint.setAddress(address);
        complaint.setWard(ward);
        if (latitude != null && !latitude.trim().isEmpty()) {
            try { complaint.setLatitude(Double.parseDouble(latitude.trim())); } catch (NumberFormatException ignored) {}
        }
        if (longitude != null && !longitude.trim().isEmpty()) {
            try { complaint.setLongitude(Double.parseDouble(longitude.trim())); } catch (NumberFormatException ignored) {}
        }
        MultipartFile uploadFile = image != null ? image : file;
        if (uploadFile != null && !uploadFile.isEmpty()) {
            String savedUrl = saveFile(uploadFile);
            if (savedUrl != null) complaint.setImageUrl(savedUrl);
        } else if (imageUrl != null && !imageUrl.trim().isEmpty()) {
            complaint.setImageUrl(imageUrl);
        } else if (imageUrlUnderscore != null && !imageUrlUnderscore.trim().isEmpty()) {
            complaint.setImageUrl(imageUrlUnderscore);
        }

        return processAndSaveComplaint(complaint, userId);
    }

    // ── GET /api/complaints/stats/summary ─────────────────────────────────────
    @GetMapping("/stats/summary")
    public ResponseEntity<?> getStats(@RequestAttribute("userId") Long userId, @RequestAttribute("userRole") String userRole) {
        List<Complaint> all = complaintRepository.findAll();
        List<Complaint> filtered = "citizen".equals(userRole)
                ? all.stream().filter(c -> userId.equals(c.getCitizenId())).collect(Collectors.toList())
                : all;

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("total", filtered.size());
        response.put("pending", filtered.stream().filter(c -> "Pending".equals(c.getStatus())).count());
        response.put("inProgress", filtered.stream().filter(c -> "In Progress".equals(c.getStatus())).count());
        response.put("resolved", filtered.stream().filter(c -> "Resolved".equals(c.getStatus())).count());
        response.put("rejected", filtered.stream().filter(c -> "Rejected".equals(c.getStatus())).count());

        List<Map<String, Object>> byCategory = filtered.stream()
                .collect(Collectors.groupingBy(Complaint::getCategory, Collectors.counting()))
                .entrySet().stream()
                .map(e -> Map.<String, Object>of("category", e.getKey(), "count", e.getValue()))
                .sorted((a, b) -> Long.compare((long)b.get("count"), (long)a.get("count")))
                .collect(Collectors.toList());
        response.put("byCategory", byCategory);

        List<Map<String, Object>> recentComplaints = filtered.stream()
                .sorted(Comparator.comparing(Complaint::getCreatedAt).reversed())
                .limit(5)
                .map(this::enrichComplaint)
                .collect(Collectors.toList());
        response.put("recentComplaints", recentComplaints);

        return ResponseEntity.ok(response);
    }

    // ── GET /api/complaints/all/map ───────────────────────────────────────────
    @GetMapping("/all/map")
    public ResponseEntity<?> getMapData(
            @RequestAttribute("userId") Long userId,
            @RequestAttribute("userRole") String userRole,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category) {

        List<Map<String, Object>> result = complaintRepository.findAll().stream()
                .filter(c -> c.getLatitude() != null && c.getLongitude() != null)
                .filter(c -> !"citizen".equals(userRole) || userId.equals(c.getCitizenId()))
                .filter(c -> status == null || status.equals(c.getStatus()))
                .filter(c -> category == null || category.equals(c.getCategory()))
                .sorted(Comparator.comparing(Complaint::getCreatedAt).reversed())
                .map(this::enrichComplaint)
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // ── GET /api/complaints/authority/calendar ────────────────────────────────
    @GetMapping("/authority/calendar")
    public ResponseEntity<?> getCalendar(@RequestAttribute("userId") Long userId, @RequestAttribute("userRole") String userRole) {
        List<Complaint> filtered = complaintRepository.findAll().stream()
                .filter(c -> !"authority".equals(userRole) || userId.equals(c.getAssignedTo()))
                .collect(Collectors.toList());

        LocalDateTime now = LocalDateTime.now();
        List<Map<String, Object>> enriched = filtered.stream()
                .sorted(Comparator.comparing(Complaint::getCreatedAt).reversed())
                .map(c -> {
            Map<String, Object> m = enrichComplaint(c);
            int sla = c.getSlaDays() != null ? c.getSlaDays() : 7;
            LocalDateTime deadline = c.getCreatedAt().plusDays(sla);
            long daysLeft = java.time.temporal.ChronoUnit.DAYS.between(now, deadline);
            m.put("deadline_date", deadline.toLocalDate().toString());
            m.put("days_left", daysLeft);
            String color = "Resolved".equals(c.getStatus()) || "Rejected".equals(c.getStatus()) ? "green"
                    : daysLeft < 0 ? "red" : daysLeft <= 2 ? "amber" : "green";
            m.put("urgency_color", color);
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(enriched);
    }

    // ── GET /api/complaints/feed/nearby ──────────────────────────────────────
    @GetMapping("/feed/nearby")
    public ResponseEntity<?> getNearbyFeed(@RequestAttribute("userId") Long userId,
                                            @RequestParam(required = false) String ward) {
        String userWard = ward != null ? ward : userRepository.findById(userId).map(u -> u.getWard() != null ? u.getWard() : "Ward 1").orElse("Ward 1");
        List<Map<String, Object>> result = complaintRepository.findAll().stream()
                .filter(c -> c.getWard() != null && (c.getWard().equals(userWard) || c.getWard().contains(userWard)))
                .sorted(Comparator.comparing(Complaint::getCreatedAt).reversed())
                .limit(50)
                .map(this::enrichComplaint)
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    // ── GET /api/complaints/:id ───────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<?> getComplaint(@PathVariable Long id,
                                           @RequestAttribute("userId") Long userId,
                                           @RequestAttribute("userRole") String userRole) {
        return complaintRepository.findById(id).map(complaint -> {
            if ("citizen".equals(userRole) && !userId.equals(complaint.getCitizenId())) {
                return ResponseEntity.status(403).body((Object) Map.of("error", "Access denied"));
            }
            Map<String, Object> m = enrichComplaint(complaint);
            List<Map<String, Object>> history = statusHistoryRepository.findByComplaintId(id).stream().map(h -> {
                Map<String, Object> hm = new LinkedHashMap<>();
                hm.put("id", h.getId()); hm.put("old_status", h.getOldStatus());
                hm.put("new_status", h.getNewStatus()); hm.put("note", h.getNote());
                hm.put("created_at", h.getCreatedAt());
                userRepository.findById(h.getChangedBy()).ifPresent(u -> { hm.put("changed_by_name", u.getName()); hm.put("changed_by_role", u.getRole()); });
                return hm;
            }).collect(Collectors.toList());
            List<Map<String, Object>> comments = commentRepository.findByComplaintId(id).stream().map(c -> {
                Map<String, Object> cm = new LinkedHashMap<>();
                cm.put("id", c.getId()); cm.put("comment", c.getComment()); cm.put("created_at", c.getCreatedAt());
                userRepository.findById(c.getUserId()).ifPresent(u -> { cm.put("user_name", u.getName()); cm.put("user_role", u.getRole()); });
                return cm;
            }).collect(Collectors.toList());
            return ResponseEntity.ok((Object) Map.of("complaint", m, "history", history, "comments", comments, "userHasUpvoted", false, "rating", Optional.empty(), "aiPrediction", Optional.empty()));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── POST /api/complaints/:id/comments ────────────────────────────────────
    @PostMapping("/{id}/comments")
    public ResponseEntity<?> addComment(@PathVariable Long id, @RequestBody Map<String, String> body, @RequestAttribute("userId") Long userId) {
        String text = body.get("comment");
        if (text == null || text.trim().isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Comment is required"));
        com.example.civic_tracker_backend.entity.Comment comment = new com.example.civic_tracker_backend.entity.Comment();
        comment.setComplaintId(id); comment.setUserId(userId); comment.setComment(text);
        commentRepository.save(comment);
        return ResponseEntity.status(201).body(Map.of("message", "Comment added successfully"));
    }

    private ResponseEntity<?> handleUpdateStatus(Long id, String newStatus, String note, String assigned, String priority, String afterImageUrl, Long userId) {
        return complaintRepository.findById(id).map(complaint -> {
            String oldStatus = complaint.getStatus();
            if (newStatus != null && !newStatus.trim().isEmpty()) {
                complaint.setStatus(newStatus);
                complaint.setUpdatedAt(LocalDateTime.now());
                if ("Resolved".equals(newStatus)) complaint.setResolvedAt(LocalDateTime.now());
            }
            if (priority != null && !priority.trim().isEmpty()) {
                complaint.setPriority(priority);
            }
            if (note != null) complaint.setResolutionNote(note);
            if (assigned != null && !assigned.trim().isEmpty()) {
                try { complaint.setAssignedTo(Long.parseLong(assigned)); } catch (NumberFormatException ignored) {}
            }
            if (afterImageUrl != null && !afterImageUrl.trim().isEmpty()) {
                complaint.setAfterImageUrl(afterImageUrl);
            }
            complaintRepository.save(complaint);
            if (newStatus != null && !newStatus.equals(oldStatus)) {
                StatusHistory history = new StatusHistory();
                history.setComplaintId(id); history.setOldStatus(oldStatus);
                history.setNewStatus(newStatus); history.setChangedBy(userId); history.setNote(note);
                statusHistoryRepository.save(history);
                Notification notif = new Notification();
                notif.setUserId(complaint.getCitizenId()); notif.setComplaintId(id);
                notif.setComplaintRef(complaint.getComplaintId());
                notif.setMessage("Your complaint " + complaint.getComplaintId() + " status changed to \"" + newStatus + "\".");
                notificationRepository.save(notif);
            }
            return ResponseEntity.ok(Map.of("message", "Complaint updated successfully", "complaint", enrichComplaint(complaint)));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── PUT /api/complaints/:id/status ────────────────────────────────────────
    @PutMapping(value = "/{id}/status", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> updateStatusJson(@PathVariable Long id, @RequestBody Map<String, String> body, @RequestAttribute("userId") Long userId) {
        return handleUpdateStatus(id, body.get("status"), body.get("note"), body.get("assigned_to"), body.get("priority"), null, userId);
    }

    @PutMapping(value = "/{id}/status", consumes = { MediaType.MULTIPART_FORM_DATA_VALUE, MediaType.APPLICATION_FORM_URLENCODED_VALUE })
    public ResponseEntity<?> updateStatusMultipart(
            @PathVariable Long id,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "note", required = false) String note,
            @RequestParam(value = "assigned_to", required = false) String assignedTo,
            @RequestParam(value = "priority", required = false) String priority,
            @RequestParam(value = "after_image", required = false) MultipartFile afterImage,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "after_image_url", required = false) String afterImageUrl,
            @RequestAttribute("userId") Long userId) {
        String savedAfterImageUrl = afterImageUrl;
        MultipartFile imgFile = afterImage != null ? afterImage : file;
        if (imgFile != null && !imgFile.isEmpty()) {
            savedAfterImageUrl = saveFile(imgFile);
        }
        return handleUpdateStatus(id, status, note, assignedTo, priority, savedAfterImageUrl, userId);
    }

    // ── PUT /api/complaints/:id/after-photo ──────────────────────────────────
    @PutMapping(value = "/{id}/after-photo")
    public ResponseEntity<?> updateAfterPhoto(
            @PathVariable Long id,
            @RequestParam(value = "after_image", required = false) MultipartFile afterImage,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "image", required = false) MultipartFile image) {
        MultipartFile img = afterImage != null ? afterImage : (file != null ? file : image);
        if (img == null || img.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No image provided"));
        }
        String url = saveFile(img);
        return complaintRepository.findById(id).map(c -> {
            c.setAfterImageUrl(url);
            complaintRepository.save(c);
            return ResponseEntity.ok(Map.of("message", "After photo updated", "after_image_url", url));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── POST /api/complaints/:id/upvote ──────────────────────────────────────
    @PostMapping("/{id}/upvote")
    public ResponseEntity<?> upvote(@PathVariable Long id) {
        return complaintRepository.findById(id).map(complaint -> {
            int newCount = (complaint.getUpvoteCount() != null ? complaint.getUpvoteCount() : 0) + 1;
            complaint.setUpvoteCount(newCount);
            if (newCount >= 50) complaint.setPriority("Critical");
            else if (newCount >= 20 && !"Critical".equals(complaint.getPriority())) complaint.setPriority("High");
            else if (newCount >= 10 && !List.of("Critical", "High").contains(complaint.getPriority())) complaint.setPriority("Medium");
            complaint.setUpdatedAt(LocalDateTime.now());
            complaintRepository.save(complaint);
            return ResponseEntity.ok(Map.of("upvoted", true, "upvote_count", newCount, "priority", complaint.getPriority()));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── POST /api/complaints/:id/rating ──────────────────────────────────────
    @PostMapping("/{id}/rating")
    public ResponseEntity<?> submitRating(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return complaintRepository.findById(id).map(complaint -> {
            if (!"Resolved".equals(complaint.getStatus())) {
                return ResponseEntity.badRequest().body((Object) Map.of("error", "Can only rate resolved complaints"));
            }
            return ResponseEntity.ok((Object) Map.of("message", "Rating submitted", "rating", body.get("rating")));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── POST /api/complaints/:id/reopen ──────────────────────────────────────
    @PostMapping("/{id}/reopen")
    public ResponseEntity<?> reopen(@PathVariable Long id, @RequestBody Map<String, String> body, @RequestAttribute("userId") Long userId) {
        String reason = body.get("reason");
        if (reason == null || reason.trim().isEmpty()) return ResponseEntity.badRequest().body(Map.of("error", "Reopen reason is required"));

        return complaintRepository.findById(id).map(original -> {
            if (!"Resolved".equals(original.getStatus()))
                return ResponseEntity.badRequest().body((Object) Map.of("error", "Only resolved complaints can be reopened"));

            Complaint newComplaint = new Complaint();
            newComplaint.setComplaintId("CMP-" + java.time.Year.now().getValue() + "-" + String.format("%04d", complaintRepository.count() + 1));
            newComplaint.setCitizenId(userId);
            newComplaint.setTitle("REOPENED: " + original.getTitle());
            newComplaint.setDescription(original.getDescription() + "\n\nREOPEN REASON: " + reason.trim());
            newComplaint.setCategory(original.getCategory());
            newComplaint.setPriority(original.getPriority());
            newComplaint.setStatus("Pending");
            newComplaint.setAddress(original.getAddress());
            newComplaint.setWard(original.getWard());
            newComplaint.setLatitude(original.getLatitude());
            newComplaint.setLongitude(original.getLongitude());
            newComplaint.setParentComplaintId(original.getId());
            newComplaint.setSlaDays(original.getSlaDays());
            newComplaint.setCreatedAt(LocalDateTime.now());
            newComplaint.setUpdatedAt(LocalDateTime.now());
            Complaint saved = complaintRepository.save(newComplaint);

            return ResponseEntity.status(201).body((Object) Map.of("message", "Complaint reopened successfully", "newComplaintId", saved.getComplaintId(), "id", saved.getId()));
        }).orElse(ResponseEntity.notFound().build());
    }
}
