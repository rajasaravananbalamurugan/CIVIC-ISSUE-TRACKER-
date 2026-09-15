# 🏛️ Citizen Civic Issue Reporting & Resolution Tracker

A full-stack web application that enables citizens to report civic issues (potholes, streetlights, garbage, etc.) with photo evidence and location, while allowing municipal authorities to track and resolve them through a centralized dashboard.

---

## 🗂️ Project Structure

```
civic-tracker/
├── backend/                    # Java Spring Boot REST API
│   ├── database/               # Local SQLite database auto-created here
│   ├── uploads/                # Uploaded complaint images
│   ├── src/main/java/          # Spring Boot controllers, entities, repositories
│   ├── build.gradle            # Gradle build configuration
│   └── src/main/resources/application.properties # Configuration (DB, JWT, Ports)
│
├── frontend/                   # React + Vite SPA
│   └── src/
│       ├── components/
│       │   └── Layout.jsx      # Sidebar navigation layout
│       ├── context/
│       │   └── AuthContext.jsx # Global auth state (React Context)
│       ├── pages/
│       │   ├── Login.jsx       # Sign-in with demo buttons
│       │   ├── Register.jsx    # Citizen registration
│       │   ├── Dashboard.jsx   # Stats overview & recent complaints
│       │   ├── Complaints.jsx  # List with search & filters
│       │   ├── ComplaintDetail.jsx  # Detail + status timeline + comments
│       │   ├── Analytics.jsx        # Authority/Admin charts (Recharts)
│       │   └── Profile.jsx          # Edit profile & change password
│       ├── utils/
│       │   └── api.js          # Axios instance & API helpers
│       └── App.jsx             # Routes & role-based access control
│
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites
- **Java 25** (or compatible JDK)
- **Node.js** v18+ & **npm** v8+

### Step 1 — Start the Java Backend

```bash
cd backend
# Windows
.\gradlew.bat bootRun
# Mac/Linux
./gradlew bootRun
```

> The API server runs at **http://localhost:5001**

### Step 2 — Start the React Frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

> The application opens at **http://localhost:5174** (or 5173)

---

## 🔑 Demo Accounts

*(Auto-seeded into the database on first boot)*

| Role | Email | Password | Access |
|------|-------|----------|--------|
| 👤 Citizen | raj@example.com | Citizen@123 | File & track own complaints |
| ⚖️ Authority | north.officer@civic.gov.in | Auth@123 | Update status, view all, analytics |
| 🛡️ Admin | admin@civic.gov.in | Admin@123 | Full access + user management |

> The Login page also has **one-click demo buttons** for these roles.

---

## 🛠️ Tech Stack

### Backend (Java)
| Tech | Purpose |
|------|---------|
| **Spring Boot 3.x** | REST API server |
| **Spring Data JPA / Hibernate** | ORM & Persistence |
| **SQLite (sqlite-jdbc)** | Embedded local database |
| **Spring Security & jjwt** | Stateless authentication |
| **Gradle** | Build tool |

### Frontend (React)
| Tech | Purpose |
|------|---------|
| **React 18** | UI framework |
| **Vite** | Build tool & dev server |
| **React Router v6** | Client-side routing |
| **Axios** | HTTP client |
| **Recharts** | Charts in Analytics page |
| **Lucide React** | Icon library |
| **react-hot-toast** | Notification toasts |

---

## 🌟 Features

### Citizen Features
- Register & login securely via JWT
- File complaints with title, description, category, and priority
- Upload photo evidence (auto-served by backend)
- Auto geo-tag with GPS coordinates
- Track real-time status (Pending → In Progress → Resolved)
- View complete status history timeline
- Upvote other complaints to auto-escalate priority

### Authority Features
- View all citizens' complaints on a single dashboard
- Filter by status, category, priority, or ward
- Update complaint status with resolution notes
- System-wide analytics with charts
- Crisis dashboard for overdue or critical issues

### Admin Features
- Everything authorities have
- Create and delete users (citizens, authorities)
- Role-based access control
- View authority performance metrics

---

## 🗄️ Database Schema (SQLite)

- **Users:** Citizens, Authorities, Admins
- **Complaints:** Issues filed by Citizens with geolocation and images
- **Status History:** Tracks timeline of updates for every complaint
- **Comments:** User-generated discussion on complaints
- **Announcements / Notifications / Badges:** Extended engagement features

**Complaint Status Flow:** `Pending → In Progress → Resolved / Rejected`

---

## 📝 Notes

- The database file `backend/database/civic_tracker.db` is auto-created and seeded on first run using `DatabaseSeeder.java`.
- Uploaded images are stored in `backend/uploads/`.
- To reset the database, simply delete `civic_tracker.db` and restart the Spring Boot server.
