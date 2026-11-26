# JANSETU AI — MERN Edition

**Universal Intake, Triage & Routing Engine** · InMobi AI Kaushal Hackathon · Uttar Pradesh

Built with **MongoDB + Express.js + React + Node.js**:
- MongoDB stores grievance records and audit history.
- Express and Node.js provide the REST API, validation, triage and routing.
- React + Vite power the citizen portal and officer dashboard.

## Features
- Hindi/English grievance intake and case tracking
- Explainable category, department and urgency suggestions
- Critical safety phrase flag and emergency-service guidance
- Similar-case matching, officer queue, search and filters
- Case assignment, status updates, analytics and audit history
- Demo seed script, automated Node tests, Docker Compose and CI

**AI transparency:** The triage service is a deterministic keyword/scoring baseline, not a hosted LLM or validated government decision system. Officers must review recommendations. It must never be used to deny service or replace emergency response.

## Run locally
Requirements: Node.js 18+ and MongoDB 6+ (local or Atlas). See [Express installation](https://expressjs.com/en/starter/installing/) and [MongoDB MERN overview](https://www.mongodb.com/docs/drivers/node-frameworks/react/).

```bash
npm install
cp .env.example .env
# Configure MONGODB_URI in .env
npm run dev
```
- React: http://localhost:5173
- API health: http://localhost:5000/api/health

Optional demo data: `npm run seed`

## Docker
```bash
docker compose up --build
```
- Frontend: http://localhost:4173
- API: http://localhost:5000

## API
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health |
| POST | `/api/complaints` | Submit grievance |
| GET | `/api/complaints` | List/filter cases |
| GET | `/api/complaints/analytics` | Dashboard metrics |
| GET | `/api/complaints/track/:id` | Citizen tracking |
| GET | `/api/complaints/:id` | Case details |
| PATCH | `/api/complaints/:id` | Officer update |

## Project layout
```
backend/src/{config,controllers,models,routes,services}
backend/test/
frontend/src/
docker-compose.yml
```

## Production checklist
Add officer authentication/RBAC, protect personal data, encryption, retention/deletion policy, abuse controls, audit-log protection, accessibility and language testing, independent triage evaluation, escalation and appeal paths, backups, monitoring and department-approved integrations. Do not enter real sensitive personal data into an unapproved demo environment.

## Pitch
**JANSETU AI — One front door. Clear priority. Accountable resolution.** A common intake layer that helps route grievances to the right department while keeping decisions with authorised human officers.

MIT License.
