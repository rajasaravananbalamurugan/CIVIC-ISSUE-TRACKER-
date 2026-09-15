package com.example.civic_tracker_backend.controller;

import com.example.civic_tracker_backend.entity.Complaint;
import com.example.civic_tracker_backend.repository.ComplaintRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public")
public class PublicController {

    @Autowired
    private ComplaintRepository complaintRepository;

    @GetMapping("/transparency")
    public ResponseEntity<List<Complaint>> getPublicComplaints() {
        // Return complaints, possibly omitting sensitive info like exact citizen ID
        return ResponseEntity.ok(complaintRepository.findAll());
    }

    @GetMapping("/track/{complaintId}")
    public ResponseEntity<?> trackComplaint(@PathVariable String complaintId) {
        List<Complaint> complaints = complaintRepository.findAll().stream()
                .filter(c -> complaintId.equals(c.getComplaintId()))
                .collect(Collectors.toList());
        
        if (complaints.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(complaints.get(0));
    }
}
