# Civic Tracker — Java Backend

A full Spring Boot 3.x REST API backend for the **Civic Issue Reporting & Resolution Tracker**, migrated from Node.js/Express to Java.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Spring Boot 4.x (Java 25) |
| Web | Spring Web MVC |
| Persistence | Spring Data JPA + Hibernate ORM |
| Database | SQLite (`sqlite-jdbc` + `hibernate-community-dialects`) |
| Security | Spring Security + JWT (`jjwt`) |
| Build Tool | Gradle |

## Default Credentials (Auto-Seeded)

| Role | Email | Password |
|---|---|---|
| Admin | admin@civic.gov.in | Admin@123 |
| Authority | north.officer@civic.gov.in | Auth@123 |
| Citizen | raj@example.com | Citizen@123 |

## Running Locally

```bash
cd backend-java
.\gradlew.bat bootRun
```

The API runs on **http://localhost:5001**

## API Endpoints

### Auth (`/api/auth`)
- `POST /login` — Login, returns JWT token
- `POST /register` — Register a new citizen account
- `GET /me` — Get current user profile (JWT required)
- `PUT /profile` — Update profile (name, phone, ward, sms/digest preferences)
- `PUT /change-password` — Change password

### Complaints (`/api/complaints`)
- `GET /` — List all complaints (filtered, paginated by role)
- `POST /` — File a new complaint
- `GET /stats/summary` — Dashboard summary stats
- `GET /all/map` — Map view data (lat/lng only)
- `GET /authority/calendar` — Calendar view with SLA deadlines
- `GET /feed/nearby` — Nearby complaints feed (citizen ward)
- `GET /:id` — Full complaint detail (with history + comments)
- `PUT /:id/status` — Update status (authority/admin)
- `POST /:id/comments` — Add a comment
- `POST /:id/upvote` — Upvote (auto-escalates priority at thresholds)
- `POST /:id/rating` — Submit resolution rating (1 or -1)
- `POST /:id/reopen` — Reopen a resolved complaint

### Admin (`/api/admin`)
- `GET /users` — List all users
- `POST /users` — Create a user
- `DELETE /users/:id` — Delete a user
- `GET /authorities` — List all authority accounts
- `GET /analytics` — Full analytics dashboard
- `GET /crisis` — Crisis dashboard (critical + overdue + unassigned)
- `POST /escalate/:id` — Escalate a complaint to critical
- `GET /performance` — Authority performance metrics

### Other
- `GET /api/citizens/badges` — Citizen badges and leaderboard
- `GET /api/notifications` — In-app notifications
- `PUT /api/notifications/read-all` — Mark all as read
- `GET /api/announcements` — Get announcements
- `POST /api/announcements` — Create announcement
- `GET /api/public/transparency` — Public complaints view
- `GET /api/public/track/:id` — Public complaint tracking
- `GET /api/health` — Health check
