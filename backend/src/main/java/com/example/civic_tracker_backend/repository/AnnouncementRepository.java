package com.example.civic_tracker_backend.repository;

import com.example.civic_tracker_backend.entity.Announcement;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {
}
