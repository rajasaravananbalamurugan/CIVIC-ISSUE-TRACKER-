package com.example.civic_tracker_backend.repository;

import com.example.civic_tracker_backend.entity.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ComplaintRepository extends JpaRepository<Complaint, Long> {
    List<Complaint> findByCitizenId(Long citizenId);
    List<Complaint> findByWard(String ward);
    Optional<Complaint> findByComplaintId(String complaintId);
}
