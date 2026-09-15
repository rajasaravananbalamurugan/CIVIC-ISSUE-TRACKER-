package com.example.civic_tracker_backend.controller;

import com.example.civic_tracker_backend.entity.Announcement;
import com.example.civic_tracker_backend.repository.AnnouncementRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/announcements")
public class AnnouncementsController {

    @Autowired
    private AnnouncementRepository announcementRepository;

    @GetMapping
    public ResponseEntity<List<Announcement>> getAllAnnouncements(@RequestParam(required = false) Boolean expired) {
        return ResponseEntity.ok(announcementRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<?> createAnnouncement(@RequestBody Announcement announcement, @RequestAttribute("userId") Long userId) {
        announcement.setCreatedBy(userId);
        return ResponseEntity.ok(announcementRepository.save(announcement));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAnnouncement(@PathVariable Long id) {
        announcementRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
