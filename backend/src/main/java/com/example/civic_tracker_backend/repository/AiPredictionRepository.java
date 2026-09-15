package com.example.civic_tracker_backend.repository;

import com.example.civic_tracker_backend.entity.AiPrediction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AiPredictionRepository extends JpaRepository<AiPrediction, Long> {
    Optional<AiPrediction> findByComplaintId(Long complaintId);
}
