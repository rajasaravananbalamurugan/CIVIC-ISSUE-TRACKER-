package com.example.civic_tracker_backend.config;

import com.example.civic_tracker_backend.entity.User;
import com.example.civic_tracker_backend.entity.Complaint;
import com.example.civic_tracker_backend.entity.StatusHistory;
import com.example.civic_tracker_backend.repository.UserRepository;
import com.example.civic_tracker_backend.repository.ComplaintRepository;
import com.example.civic_tracker_backend.repository.StatusHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * Seeds the database with default admin, authority, and citizen users
 * if they do not already exist — replicating the behavior from Node.js db.js.
 */
@Component
public class DatabaseSeeder implements CommandLineRunner {

    @Autowired private UserRepository userRepository;
    @Autowired private ComplaintRepository complaintRepository;
    @Autowired private StatusHistoryRepository statusHistoryRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.findByEmail("admin@civic.gov.in").isPresent()) {
            System.out.println("✅ Database already seeded — skipping.");
            return;
        }

        System.out.println("🌱 Seeding database with default users and sample complaints...");

        // Admin
        User admin = new User();
        admin.setName("System Admin"); admin.setEmail("admin@civic.gov.in");
        admin.setPassword(passwordEncoder.encode("Admin@123")); admin.setRole("admin");
        admin.setPhone("9000000001"); admin.setWard("All");
        admin.setCreatedAt(LocalDateTime.now()); admin.setUpdatedAt(LocalDateTime.now());
        userRepository.save(admin);

        // Authority 1
        User auth1 = new User();
        auth1.setName("Ward Officer - North"); auth1.setEmail("north.officer@civic.gov.in");
        auth1.setPassword(passwordEncoder.encode("Auth@123")); auth1.setRole("authority");
        auth1.setPhone("9000000002"); auth1.setWard("Ward 1");
        auth1.setCreatedAt(LocalDateTime.now()); auth1.setUpdatedAt(LocalDateTime.now());
        userRepository.save(auth1);

        // Authority 2
        User auth2 = new User();
        auth2.setName("Ward Officer - South"); auth2.setEmail("south.officer@civic.gov.in");
        auth2.setPassword(passwordEncoder.encode("Auth@123")); auth2.setRole("authority");
        auth2.setPhone("9000000003"); auth2.setWard("Ward 2");
        auth2.setCreatedAt(LocalDateTime.now()); auth2.setUpdatedAt(LocalDateTime.now());
        userRepository.save(auth2);

        // Citizen
        User citizen = new User();
        citizen.setName("Rajasaravanan B"); citizen.setEmail("raj@example.com");
        citizen.setPassword(passwordEncoder.encode("Citizen@123")); citizen.setRole("citizen");
        citizen.setPhone("9876543210"); citizen.setWard("Ward 1");
        citizen.setCreatedAt(LocalDateTime.now()); citizen.setUpdatedAt(LocalDateTime.now());
        userRepository.save(citizen);

        // Sample Complaints
        Complaint c1 = new Complaint();
        c1.setComplaintId("CMP-2026-0001"); c1.setCitizenId(citizen.getId());
        c1.setTitle("Large pothole on Main Street near bus stop");
        c1.setDescription("There is a huge pothole near the bus stop on Main Street that has caused multiple accidents.");
        c1.setCategory("Pothole"); c1.setStatus("In Progress"); c1.setPriority("High");
        c1.setAddress("45, Main Street, Ward 1, Chennai - 600001"); c1.setWard("Ward 1");
        c1.setLatitude(13.0827); c1.setLongitude(80.2707); c1.setSlaDays(7);
        c1.setCreatedAt(LocalDateTime.now()); c1.setUpdatedAt(LocalDateTime.now());
        complaintRepository.save(c1);
        seedHistory(c1.getId(), "Pending", admin.getId(), "Complaint filed");
        seedHistory(c1.getId(), "In Progress", auth1.getId(), "Assigned to Ward Officer North");

        Complaint c2 = new Complaint();
        c2.setComplaintId("CMP-2026-0002"); c2.setCitizenId(citizen.getId());
        c2.setTitle("Street light not working for 2 weeks");
        c2.setDescription("The street light at the junction near Anna Nagar 3rd street has not been working for 2 weeks.");
        c2.setCategory("Streetlight"); c2.setStatus("Pending"); c2.setPriority("Medium");
        c2.setAddress("Anna Nagar 3rd Street Junction, Ward 2, Chennai - 600040"); c2.setWard("Ward 2");
        c2.setLatitude(13.0878); c2.setLongitude(80.2785); c2.setSlaDays(5);
        c2.setCreatedAt(LocalDateTime.now()); c2.setUpdatedAt(LocalDateTime.now());
        complaintRepository.save(c2);
        seedHistory(c2.getId(), "Pending", citizen.getId(), "Complaint filed");

        Complaint c3 = new Complaint();
        c3.setComplaintId("CMP-2026-0003"); c3.setCitizenId(citizen.getId());
        c3.setTitle("Garbage not collected for 5 days");
        c3.setDescription("Garbage has not been collected for 5 consecutive days causing health hazards.");
        c3.setCategory("Garbage"); c3.setStatus("Resolved"); c3.setPriority("Critical");
        c3.setAddress("12, Nehru Street, Ward 1, Chennai - 600001"); c3.setWard("Ward 1");
        c3.setLatitude(13.0804); c3.setLongitude(80.2623); c3.setSlaDays(3);
        c3.setResolutionNote("Garbage collected and area sanitized.");
        c3.setResolvedAt(LocalDateTime.now()); c3.setCreatedAt(LocalDateTime.now()); c3.setUpdatedAt(LocalDateTime.now());
        complaintRepository.save(c3);
        seedHistory(c3.getId(), "Pending", citizen.getId(), "Complaint filed");
        seedHistory(c3.getId(), "Resolved", auth1.getId(), "Garbage collected and area sanitized.");

        System.out.println("✅ Database seeded successfully.");
        System.out.println("📧 Admin: admin@civic.gov.in / Admin@123");
        System.out.println("📧 Authority: north.officer@civic.gov.in / Auth@123");
        System.out.println("📧 Citizen: raj@example.com / Citizen@123");
    }

    private void seedHistory(Long complaintId, String status, Long changedBy, String note) {
        StatusHistory h = new StatusHistory();
        h.setComplaintId(complaintId); h.setNewStatus(status);
        h.setChangedBy(changedBy); h.setNote(note);
        h.setCreatedAt(LocalDateTime.now());
        statusHistoryRepository.save(h);
    }
}
