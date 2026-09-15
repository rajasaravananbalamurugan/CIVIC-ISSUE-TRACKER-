package com.example.civic_tracker_backend.service;

import org.springframework.stereotype.Service;

@Service
public class EmailService {

    public void sendEmail(String to, String subject, String text) {
        // Stub for email sending
        System.out.println("--- MOCK EMAIL SENDER ---");
        System.out.println("To: " + to);
        System.out.println("Subject: " + subject);
        System.out.println("Text: " + text);
        System.out.println("-------------------------");
    }
}
