package com.example.civic_tracker_backend.controller;

import com.example.civic_tracker_backend.entity.User;
import com.example.civic_tracker_backend.repository.UserRepository;
import com.example.civic_tracker_backend.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtUtil jwtUtil;

    // ── POST /api/auth/register ──────────────────────────────────────────────
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> data) {
        String name = data.get("name");
        String email = data.get("email");
        String password = data.get("password");

        if (name == null || email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Name, email, and password are required"));
        }
        if (password.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "Password must be at least 6 characters"));
        }
        if (userRepository.findByEmail(email.toLowerCase()).isPresent()) {
            return ResponseEntity.status(409).body(Map.of("error", "Email already registered"));
        }

        User user = new User();
        user.setName(name);
        user.setEmail(email.toLowerCase());
        user.setPassword(passwordEncoder.encode(password));
        user.setRole("citizen");
        user.setPhone(data.get("phone"));
        user.setWard(data.get("ward"));
        user.setSmsEnabled(1);
        user.setDigestEnabled(1);
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        String token = jwtUtil.generateJwtToken(user);
        return ResponseEntity.status(201).body(Map.of(
                "message", "Registration successful",
                "token", token,
                "user", safeUser(user)
        ));
    }

    // ── POST /api/auth/login ─────────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String email = credentials.get("email");
        String password = credentials.get("password");
        if (email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and password are required"));
        }
        Optional<User> userOpt = userRepository.findByEmail(email.toLowerCase());
        if (userOpt.isEmpty() || !passwordEncoder.matches(password, userOpt.get().getPassword())) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid email or password"));
        }
        User user = userOpt.get();
        String token = jwtUtil.generateJwtToken(user);
        return ResponseEntity.ok(Map.of(
                "message", "Login successful",
                "token", token,
                "user", safeUser(user)
        ));
    }

    // ── GET /api/auth/me ─────────────────────────────────────────────────────
    @GetMapping("/me")
    public ResponseEntity<?> getMe(@RequestAttribute("userId") Long userId) {
        return userRepository.findById(userId)
                .map(u -> ResponseEntity.ok((Object) safeUser(u)))
                .orElse(ResponseEntity.status(404).body(Map.of("error", "User not found")));
    }

    // ── PUT /api/auth/profile ─────────────────────────────────────────────────
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestAttribute("userId") Long userId,
                                            @RequestBody Map<String, Object> data) {
        return userRepository.findById(userId).map(user -> {
            if (data.containsKey("name")) user.setName((String) data.get("name"));
            if (data.containsKey("phone")) user.setPhone((String) data.get("phone"));
            if (data.containsKey("ward")) user.setWard((String) data.get("ward"));
            if (data.containsKey("sms_enabled")) user.setSmsEnabled(Boolean.TRUE.equals(data.get("sms_enabled")) ? 1 : 0);
            if (data.containsKey("digest_enabled")) user.setDigestEnabled(Boolean.TRUE.equals(data.get("digest_enabled")) ? 1 : 0);
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Profile updated", "user", safeUser(user)));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── PUT /api/auth/change-password ────────────────────────────────────────
    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestAttribute("userId") Long userId,
                                             @RequestBody Map<String, String> data) {
        return userRepository.findById(userId).map(user -> {
            if (!passwordEncoder.matches(data.get("currentPassword"), user.getPassword())) {
                return ResponseEntity.status(401).body((Object) Map.of("error", "Current password is incorrect"));
            }
            user.setPassword(passwordEncoder.encode(data.get("newPassword")));
            user.setUpdatedAt(LocalDateTime.now());
            userRepository.save(user);
            return ResponseEntity.ok((Object) Map.of("message", "Password changed successfully"));
        }).orElse(ResponseEntity.notFound().build());
    }

    private Map<String, Object> safeUser(User user) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", user.getId());
        m.put("name", user.getName());
        m.put("email", user.getEmail());
        m.put("role", user.getRole());
        m.put("phone", user.getPhone());
        m.put("ward", user.getWard());
        m.put("sms_enabled", user.getSmsEnabled());
        m.put("digest_enabled", user.getDigestEnabled());
        m.put("created_at", user.getCreatedAt());
        return m;
    }
}
