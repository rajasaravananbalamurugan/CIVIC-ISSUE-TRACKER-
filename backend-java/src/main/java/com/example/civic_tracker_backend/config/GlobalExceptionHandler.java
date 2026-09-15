package com.example.civic_tracker_backend.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.Map;

/**
 * Global exception handler — returns clean JSON errors instead of
 * Spring's default HTML "Whitelabel Error Page".
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(org.springframework.web.bind.MissingServletRequestParameterException.class)
    public ResponseEntity<?> handleMissingParam(Exception ex) {
        return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(org.springframework.web.bind.ServletRequestBindingException.class)
    public ResponseEntity<?> handleMissingAttribute(Exception ex, HttpServletRequest request) {
        // This fires when @RequestAttribute("userId") is missing — i.e., no JWT was sent
        return ResponseEntity.status(401).body(Map.of(
            "error", "Unauthorized",
            "message", "A valid JWT token is required. Include 'Authorization: Bearer <token>' in your request header."
        ));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<?> handleNotFound(Exception ex) {
        return ResponseEntity.status(404).body(Map.of("error", "Route not found"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneral(Exception ex) {
        return ResponseEntity.status(500).body(Map.of("error", "Internal server error", "message", ex.getMessage()));
    }
}
