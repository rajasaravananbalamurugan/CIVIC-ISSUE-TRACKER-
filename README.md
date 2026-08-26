# 🏛️ Citizen Civic Issue Reporting & Resolution Tracker

A full-stack web application that enables citizens to report civic issues (potholes, streetlights, garbage, etc.) with photo evidence and location, while allowing municipal authorities to track and resolve them through a centralized dashboard.

---

## 🗂️ Project Structure

```
civic-tracker/
├── backend/                    # Node.js + Express REST API
│   ├── database/
│   │   └── db.js               # SQLite database (sql.js) setup & seeding
│   ├── middleware/
│   │   └── auth.js             # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js             # Register, Login, Profile endpoints
│   │   ├── complaints.js       # Complaint CRUD, status update, comments
│   │   └── admin.js            # User management, analytics
│   ├── uploads/                # Uploaded complaint images (auto-created)
│   ├── server.js               # Express server entry point
│   └── package.json
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
│       │   ├── NewComplaint.jsx     # File a new complaint form
│       │   ├── Analytics.jsx        # Authority/Admin charts (Recharts)
│       │   ├── AdminPanel.jsx       # Admin user management
│       │   └── Profile.jsx          # Edit profile & change password
│       ├── utils/
│       │   └── api.js          # Axios instance & API helpers
│       ├── App.jsx             # Routes & role-based access control
│       ├── index.css           # Global design system styles
│       └── main.jsx            # React entry point
│
├── start-backend.sh            # One-command backend start
├── start-frontend.sh           # One-command frontend start
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites
- **Node.js** v18+ (https://nodejs.org)
- **npm** v8+

### Step 1 — Install & Start Backend

```bash
cd backend
npm install
node server.js
```

> API runs at **http://localhost:5000**

### Step 2 — Install & Start Frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

> App opens at **http://localhost:5173**

---

## 🔑 Demo Accounts

| Role | Email | Password | Access |
|------|-------|----------|--------|
| 👤 Citizen | raj@example.com | Citizen@123 | File & track own complaints |
| ⚖️ Authority | north.officer@civic.gov.in | Auth@123 | Update status, view all, analytics |
| 🛡️ Admin | admin@civic.gov.in | Admin@123 | Full access + user management |

> The Login page also has **one-click demo buttons** for all three roles.

---

## 🛠️ Tech Stack

### Backend
| Tech | Purpose |
|------|---------|
| **Node.js + Express** | REST API server |
| **sql.js** | SQLite database (pure JavaScript, no native binaries) |
| **JWT (jsonwebtoken)** | Stateless authentication |
| **bcryptjs** | Password hashing |
| **multer** | Image upload handling |
| **cors** | Cross-origin request support |

### Frontend
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

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new citizen |
| POST | `/api/auth/login` | Login any user |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |
| PUT | `/api/auth/change-password` | Change password |

### Complaints
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/complaints` | List complaints (filtered) | All |
| POST | `/api/complaints` | File new complaint + image | Citizen |
| GET | `/api/complaints/:id` | Get complaint details | All |
| PUT | `/api/complaints/:id/status` | Update status | Authority/Admin |
| POST | `/api/complaints/:id/comments` | Add comment | All |
| GET | `/api/complaints/stats/summary` | Dashboard stats | All |

### Admin
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/admin/users` | List all users | Admin |
| POST | `/api/admin/users` | Create user | Admin |
| DELETE | `/api/admin/users/:id` | Delete user | Admin |
| GET | `/api/admin/authorities` | List authorities | Auth/Admin |
| GET | `/api/admin/analytics` | System analytics | Auth/Admin |

---

## 🌟 Features

### Citizen Features
- Register & login securely
- File complaints with title, description, category, and priority
- Upload photo evidence (JPG/PNG/WebP up to 5MB)
- Auto geo-tag with GPS coordinates
- Track real-time status (Pending → In Progress → Resolved)
- View complete status history timeline
- Add comments on complaints

### Authority Features
- View all citizens' complaints on a single dashboard
- Filter by status, category, priority, or ward
- Update complaint status with resolution notes
- Assign complaints to other officers
- System-wide analytics with charts
- Recent activity feed

### Admin Features
- Everything authorities have
- Create and delete users (citizens, authorities)
- Role-based access control
- User management table with complaint counts

---

## 🗄️ Database Schema

```
users           — id, name, email, password, role, phone, ward
complaints      — id, complaint_id, citizen_id, title, description, category,
                   status, priority, address, ward, lat, lng, image_url,
                   assigned_to, resolution_note, resolved_at
status_history  — id, complaint_id, old_status, new_status, changed_by, note
comments        — id, complaint_id, user_id, comment
```

**Complaint Status Flow:** `Pending → In Progress → Resolved / Rejected`

**Categories:** Pothole, Streetlight, Garbage, Water Supply, Drainage, Road Damage, Encroachment, Noise, Other

**Priority Levels:** Low, Medium, High, Critical

---

## 🔧 Environment Variables (Optional)

Create `backend/.env` to override defaults:

```env
PORT=5000
JWT_SECRET=your_custom_jwt_secret_here
```

---

## 📝 Notes

- The database file `backend/database/civic_tracker.db` is auto-created on first run
- Uploaded images are stored in `backend/uploads/`
- The database is seeded automatically with 3 sample complaints and 4 demo users
- To reset the database, simply delete `civic_tracker.db` and restart the server

