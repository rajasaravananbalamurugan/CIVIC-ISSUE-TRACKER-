package com.example.civic_tracker_backend.controller;

import com.example.civic_tracker_backend.entity.Notification;
import com.example.civic_tracker_backend.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationRepository notificationRepository;

    @GetMapping
    public ResponseEntity<List<Notification>> getNotifications(@RequestAttribute("userId") Long userId) {
        return ResponseEntity.ok(notificationRepository.findByUserId(userId));
    }

    @GetMapping("/count")
    public ResponseEntity<?> getUnreadCount(@RequestAttribute("userId") Long userId) {
        int count = notificationRepository.countByUserIdAndIsRead(userId, 0);
        return ResponseEntity.ok(Map.of("count", count));
    }

    @PutMapping("/read-all")
    public ResponseEntity<?> markAllRead(@RequestAttribute("userId") Long userId) {
        List<Notification> notifications = notificationRepository.findByUserId(userId);
        notifications.forEach(n -> n.setIsRead(1));
        notificationRepository.saveAll(notifications);
        return ResponseEntity.ok(Map.of("success", true));
    }
}
