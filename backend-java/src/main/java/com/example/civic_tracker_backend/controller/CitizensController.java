package com.example.civic_tracker_backend.controller;

import com.example.civic_tracker_backend.entity.Complaint;
import com.example.civic_tracker_backend.repository.ComplaintRepository;
import com.example.civic_tracker_backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/citizens")
public class CitizensController {

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/badges")
    public ResponseEntity<?> getBadges(@RequestAttribute("userId") Long userId,
                                        @RequestAttribute("userRole") String userRole) {
        List<Complaint> all = complaintRepository.findAll();
        List<Complaint> userComplaints = all.stream()
                .filter(c -> userId.equals(c.getCitizenId()))
                .collect(Collectors.toList());

        long totalFiled = userComplaints.size();
        long totalResolved = userComplaints.stream().filter(c -> "Resolved".equals(c.getStatus())).count();
        long quickResolved = userComplaints.stream()
                .filter(c -> "Resolved".equals(c.getStatus()) && c.getResolvedAt() != null)
                .filter(c -> java.time.temporal.ChronoUnit.HOURS.between(c.getCreatedAt(), c.getResolvedAt()) <= 48)
                .count();

        String userWard = userRepository.findById(userId).map(u -> u.getWard() != null ? u.getWard() : "Ward 1").orElse("Ward 1");

        // Ward leaderboard
        Map<Long, Long> wardCounts = all.stream()
                .filter(c -> userWard.equals(c.getWard()))
                .collect(Collectors.groupingBy(Complaint::getCitizenId, Collectors.counting()));
        boolean isWardHero = wardCounts.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(e -> e.getKey().equals(userId))
                .orElse(false);

        List<Map<String, Object>> badges = new ArrayList<>();

        badges.add(Map.of("id", "first_report", "title", "First Report", "icon", "🌱",
                "description", "Filed your first civic issue report",
                "earned", totalFiled >= 1, "progress", Math.min(totalFiled, 1) + " / 1"));

        badges.add(Map.of("id", "active_citizen", "title", "Active Citizen", "icon", "⚡",
                "description", "Filed 5 or more civic complaints",
                "earned", totalFiled >= 5, "progress", Math.min(totalFiled, 5) + " / 5"));

        badges.add(Map.of("id", "ward_hero", "title", "Ward Hero", "icon", "👑",
                "description", "Top complaint contributor in your ward this month",
                "earned", isWardHero, "progress", isWardHero ? "Rank #1" : "Keep reporting"));

        badges.add(Map.of("id", "quick_resolver", "title", "Quick Resolver", "icon", "🚀",
                "description", "Had a complaint resolved in under 48 hours",
                "earned", quickResolved >= 1, "progress", quickResolved + " resolved <48h"));

        badges.add(Map.of("id", "verified_contributor", "title", "Verified Contributor", "icon", "⭐",
                "description", "Successfully got 3 or more issues resolved",
                "earned", totalResolved >= 3, "progress", Math.min(totalResolved, 3) + " / 3"));

        // Ward leaderboard top 5 users
        List<Map<String, Object>> wardLeaderboard = wardCounts.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(5)
                .map(e -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", e.getKey());
                    row.put("monthly_count", e.getValue());
                    userRepository.findById(e.getKey()).ifPresent(u -> {
                        row.put("name", u.getName());
                        row.put("ward", u.getWard());
                    });
                    return row;
                }).collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
                "badges", badges,
                "totalFiled", totalFiled,
                "totalResolved", totalResolved,
                "wardLeaderboard", wardLeaderboard,
                "userWard", userWard
        ));
    }
}
