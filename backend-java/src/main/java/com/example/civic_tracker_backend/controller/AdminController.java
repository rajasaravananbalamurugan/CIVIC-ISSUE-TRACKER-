package com.example.civic_tracker_backend.controller;

import com.example.civic_tracker_backend.entity.User;
import com.example.civic_tracker_backend.entity.Complaint;
import com.example.civic_tracker_backend.entity.Notification;
import com.example.civic_tracker_backend.entity.StatusHistory;
import com.example.civic_tracker_backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired private UserRepository userRepository;
    @Autowired private ComplaintRepository complaintRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private StatusHistoryRepository statusHistoryRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> data) {
        if (userRepository.findByEmail(data.get("email")).isPresent()) {
            return ResponseEntity.status(409).body(Map.of("error", "Email already registered"));
        }
        User user = new User();
        user.setName(data.get("name"));
        user.setEmail(data.get("email").toLowerCase());
        user.setPassword(passwordEncoder.encode(data.get("password")));
        user.setRole(data.get("role"));
        user.setPhone(data.get("phone"));
        user.setWard(data.get("ward"));
        userRepository.save(user);
        return ResponseEntity.status(201).body(Map.of("message", "User created", "user", user));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        return userRepository.findById(id).map(user -> {
            if ("admin".equals(user.getRole())) return ResponseEntity.badRequest().<Object>body(Map.of("error", "Cannot delete admin users"));
            userRepository.delete(user);
            return ResponseEntity.ok().<Object>build();
        }).orElse(ResponseEntity.notFound().<Object>build());
    }

    @GetMapping("/authorities")
    public ResponseEntity<List<User>> getAuthorities() {
        return ResponseEntity.ok(userRepository.findAll().stream()
                .filter(u -> "authority".equals(u.getRole()) || "admin".equals(u.getRole()))
                .collect(Collectors.toList()));
    }

    @GetMapping("/analytics")
    public ResponseEntity<?> getAnalytics() {
        List<Complaint> all = complaintRepository.findAll();
        long total = all.size();
        long pending = all.stream().filter(c -> "Pending".equals(c.getStatus())).count();
        long inProgress = all.stream().filter(c -> "In Progress".equals(c.getStatus())).count();
        long resolved = all.stream().filter(c -> "Resolved".equals(c.getStatus())).count();
        long rejected = all.stream().filter(c -> "Rejected".equals(c.getStatus())).count();
        long critical = all.stream().filter(c -> "Critical".equals(c.getPriority())).count();

        Map<String, Long> catMap = all.stream().collect(Collectors.groupingBy(Complaint::getCategory, Collectors.counting()));
        List<Map<String, Object>> byCategory = catMap.entrySet().stream().map(e -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("category", e.getKey()); m.put("total", e.getValue());
            m.put("resolved", all.stream().filter(c -> e.getKey().equals(c.getCategory()) && "Resolved".equals(c.getStatus())).count());
            return m;
        }).sorted((a, b) -> Long.compare((long)b.get("total"), (long)a.get("total"))).collect(Collectors.toList());

        Map<String, Long> wardMap = all.stream().filter(c -> c.getWard() != null)
                .collect(Collectors.groupingBy(Complaint::getWard, Collectors.counting()));
        List<Map<String, Object>> byWard = wardMap.entrySet().stream().map(e -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("ward", e.getKey()); m.put("total", e.getValue());
            m.put("resolved", all.stream().filter(c -> e.getKey().equals(c.getWard()) && "Resolved".equals(c.getStatus())).count());
            return m;
        }).sorted((a, b) -> Long.compare((long)b.get("total"), (long)a.get("total"))).collect(Collectors.toList());

        List<User> allUsers = userRepository.findAll();
        long totalCitizens = allUsers.stream().filter(u -> "citizen".equals(u.getRole())).count();
        long totalAuthorities = allUsers.stream().filter(u -> "authority".equals(u.getRole())).count();
        OptionalDouble avgRes = all.stream()
                .filter(c -> "Resolved".equals(c.getStatus()) && c.getResolvedAt() != null)
                .mapToLong(c -> java.time.temporal.ChronoUnit.DAYS.between(c.getCreatedAt(), c.getResolvedAt()))
                .average();

        Map<String, Object> overview = Map.of("total", total, "pending", pending, "inProgress", inProgress, "resolved", resolved, "rejected", rejected, "critical", critical);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("overview", overview);
        response.put("byCategory", byCategory);
        response.put("byWard", byWard);
        response.put("totalCitizens", totalCitizens);
        response.put("totalAuthorities", totalAuthorities);
        response.put("avgResolutionDays", avgRes.isPresent() ? Math.round(avgRes.getAsDouble() * 10.0) / 10.0 : null);
        response.put("slaBreaches", Collections.emptyList());
        response.put("recentActivity", Collections.emptyList());
        response.put("monthlyTrend", Collections.emptyList());
        response.put("ratingsRow", Map.of("total", 0, "positive", 0, "negative", 0));
        response.put("allRatings", Collections.emptyList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/crisis")
    public ResponseEntity<?> getCrisisDashboard() {
        List<Complaint> all = complaintRepository.findAll();
        LocalDateTime now = LocalDateTime.now();
        List<Complaint> criticalList = all.stream()
                .filter(c -> "Critical".equals(c.getPriority()) && !"Resolved".equals(c.getStatus()) && !"Rejected".equals(c.getStatus()))
                .collect(Collectors.toList());
        List<Map<String, Object>> overdue = all.stream()
                .filter(c -> !"Resolved".equals(c.getStatus()) && !"Rejected".equals(c.getStatus()))
                .filter(c -> {
                    int sla = c.getSlaDays() != null ? c.getSlaDays() : 7;
                    return java.time.temporal.ChronoUnit.DAYS.between(c.getCreatedAt(), now) > sla;
                })
                .map(c -> {
                    int sla = c.getSlaDays() != null ? c.getSlaDays() : 7;
                    long daysOverdue = java.time.temporal.ChronoUnit.DAYS.between(c.getCreatedAt(), now) - sla;
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", c.getId()); m.put("complaint_id", c.getComplaintId());
                    m.put("title", c.getTitle()); m.put("status", c.getStatus());
                    m.put("priority", c.getPriority()); m.put("ward", c.getWard());
                    m.put("category", c.getCategory()); m.put("days_overdue", daysOverdue);
                    return m;
                })
                .sorted((a, b) -> Long.compare((long)b.get("days_overdue"), (long)a.get("days_overdue")))
                .collect(Collectors.toList());
        List<Complaint> unassigned48h = all.stream()
                .filter(c -> c.getAssignedTo() == null && "Pending".equals(c.getStatus()))
                .filter(c -> java.time.temporal.ChronoUnit.HOURS.between(c.getCreatedAt(), now) > 48)
                .collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("critical", criticalList, "overdue", overdue, "wardSpikes", Collections.emptyList(), "unassigned48h", unassigned48h));
    }

    @PostMapping("/escalate/{id}")
    public ResponseEntity<?> escalateComplaint(@PathVariable Long id, @RequestAttribute("userId") Long userId) {
        return complaintRepository.findById(id).map(complaint -> {
            complaint.setPriority("Critical");
            complaint.setIsEscalated(1);
            complaint.setUpdatedAt(LocalDateTime.now());
            complaintRepository.save(complaint);

            StatusHistory history = new StatusHistory();
            history.setComplaintId(id);
            history.setOldStatus(complaint.getStatus());
            history.setNewStatus(complaint.getStatus());
            history.setChangedBy(userId);
            history.setNote("🚨 ESCALATED TO CRITICAL BY ADMIN");
            statusHistoryRepository.save(history);

            Notification notif = new Notification();
            notif.setUserId(complaint.getCitizenId());
            notif.setComplaintId(id);
            notif.setComplaintRef(complaint.getComplaintId());
            notif.setMessage("🚨 ALERT: Your complaint " + complaint.getComplaintId() + " has been escalated to CRITICAL priority.");
            notificationRepository.save(notif);

            return ResponseEntity.ok(Map.of("message", "Complaint escalated successfully", "complaint_id", complaint.getComplaintId()));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/performance")
    public ResponseEntity<?> getPerformance(@RequestAttribute("userId") Long currentUserId,
                                             @RequestParam(required = false) Long officer_id) {
        Long targetId = officer_id != null ? officer_id : currentUserId;
        return userRepository.findById(targetId).map(officer -> {
            List<Complaint> assigned = complaintRepository.findAll().stream()
                    .filter(c -> targetId.equals(c.getAssignedTo())).collect(Collectors.toList());
            long assignedCount = assigned.size();
            long resolvedCount = assigned.stream().filter(c -> "Resolved".equals(c.getStatus())).count();
            long pendingCount = assigned.stream().filter(c -> "Pending".equals(c.getStatus()) || "In Progress".equals(c.getStatus())).count();
            long resolutionRate = assignedCount > 0 ? Math.round((resolvedCount * 100.0) / assignedCount) : 0;
            long totalOfficers = userRepository.findAll().stream().filter(u -> "authority".equals(u.getRole())).count();

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("officer", Map.of("id", officer.getId(), "name", officer.getName(), "email", officer.getEmail(), "ward", officer.getWard() != null ? officer.getWard() : ""));
            response.put("assignedCount", assignedCount);
            response.put("resolvedCount", resolvedCount);
            response.put("pendingCount", pendingCount);
            response.put("resolutionRate", resolutionRate);
            response.put("avgResolutionDays", 0);
            response.put("satisfactionScore", 100);
            response.put("officerRank", 1);
            response.put("totalOfficers", totalOfficers);
            response.put("byCategory", Collections.emptyList());
            return ResponseEntity.ok(response);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/trigger-digest")
    public ResponseEntity<?> triggerDigest() {
        return ResponseEntity.ok(Map.of("message", "Weekly digest triggered (stub in Java backend)"));
    }

    @PostMapping("/trigger-reminders")
    public ResponseEntity<?> triggerReminders() {
        return ResponseEntity.ok(Map.of("message", "Reminder nudges triggered (stub in Java backend)"));
    }
}
