package com.example.civic_tracker_backend.repository;

import com.example.civic_tracker_backend.entity.StatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface StatusHistoryRepository extends JpaRepository<StatusHistory, Long> {
    List<StatusHistory> findByComplaintId(Long complaintId);
}
