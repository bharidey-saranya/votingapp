# CivicVote — Secure Digital Voting Platform 🗳️

CivicVote is a full-stack digital voting web application built using **Node.js**, **Express.js**, **MongoDB**, and **Vanilla HTML/CSS/JavaScript**. It provides cryptographic ballot casting, authenticated citizen participation, live election telemetry, and an administrative candidate management dashboard.

---

## 🌟 Key Features

### 👤 Citizen / Voter Portal
- **Secure Registration:** Citizen signup with 12-digit Aadhar Card Number validation, age verification (18+), and password security policies.
- **JWT Authentication:** Token-based authentication with auto-session restore.
- **One-Vote Enforcement:** Voters can cast only one ballot. Once cast, the ballot is cryptographically locked and the voter cannot vote again.
- **Ballot Confirmation:** Multi-step vote verification modal to prevent accidental submissions.
- **Profile & Security:** View voter registration status and update password.

### 📊 Live Results & Telemetry
- **Live Leaderboard:** Real-time vote count breakdown sorted from highest to lowest votes.
- **Visual Analytics:** Dynamic percentage progress bars for candidate vote shares.
- **Award Badges:** Visual rank highlights for top candidates.

### 🛡️ Admin Management Panel
- **Candidate Registry:** Add new candidates (`name`, `party`, `age`).
- **Edit Candidates:** Modify candidate details.
- **Status Toggle:** Activate or deactivate candidates from the active ballot.
- **Audit Protections:** Administrators are strictly prohibited from casting ballots.

---

## 🛠️ Technology Stack

- **Backend:** Node.js, Express.js (REST API architecture)
- **Database:** MongoDB, Mongoose ODM
- **Authentication & Security:** JSON Web Tokens (JWT), Bcrypt password hashing
- **Frontend:** Semantic HTML5, Custom Vanilla CSS (Modern GovTech Dark Theme with Google Fonts *Outfit* & *Plus Jakarta Sans*), Vanilla JavaScript SPA

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/bharidey-saranya/votingapp.git
cd votingapp
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file in the root directory:
```env
PORT=3000
MONGODB_URL_LOCAL=mongodb://localhost:27017/voting
JWT_SECRET=your_jwt_secret_key
```

### 4. Start the database & server
Make sure your MongoDB server is running:
```bash
# Start MongoDB locally (or use MongoDB Atlas connection string in .env)
# Then run the application:
npm run dev
# or
npm start
```

Open your browser and navigate to:
```text
http://localhost:3000
```

---

## 📡 API Endpoints Overview

### User Routes (`/user`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/user/signup` | Register a new voter or admin | No |
| `POST` | `/user/login` | Authenticate voter with Aadhar & Password | No |
| `GET` | `/user/profile` | Get current logged-in user profile | Bearer Token |
| `PUT` | `/user/updatepswd` | Update user password | Bearer Token |

### Candidate Routes (`/candidate`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/candidate/candidatelist` | Get list of all candidates | Bearer Token |
| `GET` | `/candidate/votecount` | Get live election results sorted by votes | Bearer Token |
| `POST` | `/candidate/vote/:candidateid` | Cast vote for a candidate | Bearer Token (Voter only) |
| `POST` | `/candidate/createcandidate` | Add a new candidate | Bearer Token (Admin only) |
| `PUT` | `/candidate/updatecandidate/:candidateid` | Edit candidate details | Bearer Token (Admin only) |
| `PUT` | `/candidate/candidate_status/:candidateid` | Toggle candidate active status | Bearer Token (Admin only) |

---

## 📄 License
This project is licensed under the ISC License.
