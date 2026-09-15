package com.example.civic_tracker_backend.repository;

import com.example.civic_tracker_backend.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByComplaintId(Long complaintId);
}
