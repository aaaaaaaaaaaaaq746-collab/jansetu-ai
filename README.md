# JANSETU AI — GenAI-enabled MERN Edition

**Universal Intake, Triage & Routing Engine** · InMobi AI Kaushal Hackathon · Uttar Pradesh

Built with **MongoDB + Express.js + React + Node.js**. The optional live GenAI layer uses the OpenAI API from the Node backend; the browser never receives the API key.

## Five GenAI capabilities

1. **Multilingual AI intake:** understands Hindi, English and Hinglish complaints and produces an English-normalised interpretation while retaining the citizen's original text.
2. **Smart classification:** recommends a grievance category, department and priority based on meaning and context.
3. **AI complaint summary:** creates a concise officer-friendly summary.
4. **AI routing assistant:** explains the suggested department and proposes a next action.
5. **AI reply assistant:** drafts a citizen-facing status reply for an officer to review and edit. The app does not send it automatically.

The AI response is constrained to JSON and checked against allowed categories and priority values. Existing deterministic rules remain the fallback if no API key is configured or intake AI is unavailable. Emergency phrase detection remains active and AI cannot lower a detected critical flag. All AI recommendations require human review.

## Configure GenAI

Set these backend environment variables in `.env`:

```env
OPENAI_API_KEY=your_server_side_api_key
OPENAI_MODEL=gpt-4o-mini
```

Keep `OPENAI_API_KEY` private. Do not add it to frontend variables, source control, screenshots or client-side code. Without a key, JANSETU still runs using the rules-based fallback; the UI labels this clearly.

## Run locally

Requirements: Node.js 18+ and MongoDB 6+ (local or Atlas).

```bash
npm install
cp .env.example .env
# Configure MONGODB_URI and optional OpenAI settings in .env
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

Pass `OPENAI_API_KEY` and `OPENAI_MODEL` to the backend container through your deployment's environment configuration; never bake secrets into an image.

## API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Health |
| POST | `/api/complaints/ai/analyze` | Preview multilingual GenAI intake analysis |
| POST | `/api/complaints` | Submit grievance and save AI/rules analysis |
| POST | `/api/complaints/:id/draft-reply` | Generate an officer-reviewed reply draft |
| GET | `/api/complaints` | List/filter cases |
| GET | `/api/complaints/analytics` | Dashboard metrics |
| GET | `/api/complaints/track/:id` | Citizen tracking |
| GET | `/api/complaints/:id` | Case details |
| PATCH | `/api/complaints/:id` | Officer update |

## Grievance operations features

- **SLA deadlines and escalation:** new cases receive a response target based on priority (normal 72 hours, high 24 hours, critical 4 hours). The backend checks overdue cases every minute and on dashboard/API reads. A missed normal SLA becomes high, a missed high SLA becomes critical, and a missed critical SLA is flagged for senior-officer intervention. Every escalation is written to the case audit trail. These are configurable starter targets, not official statutory service guarantees.
- **District issue heatmap:** officer analytics and the public dashboard show district totals, open counts and critical counts, plus category/department aggregates.
- **Evidence uploads:** citizens may attach up to four JPG, PNG, WEBP, PDF or TXT files, up to 5 MB each. Files are stored on the API server and metadata is recorded against the grievance. Docker Compose mounts a persistent uploads_data volume.
- **Duplicate grouping:** incoming complaints are compared with the latest 250 cases using token-overlap similarity. A match at 55% or higher is linked to the existing group for officer review; it does not silently merge or close complaints.
- **Public transparency dashboard:** exposes aggregate counts, resolution rate, district/category/department breakdowns only. It does not return names, phone numbers, complaint text or evidence.

### New API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/complaints/public/stats` | Privacy-safe public aggregate dashboard data |
| POST | `/api/complaints/:id/attachments` | Upload up to four evidence files (multipart field: `files`) |
| GET | `/api/complaints/:id/attachments/:attachmentId` | Download a grievance attachment |
| GET | `/api/complaints/analytics` | Includes district heatmap, overdue and duplicate counts |

SLA checks run in the Node process and during dashboard/API reads. For multi-instance or serverless production hosting, move the scheduler to a single dedicated worker/queue to avoid duplicate concurrent processing. Keep the uploads directory on persistent private storage; local container filesystems are not durable by default.

## Safety, privacy and production readiness

This is a hackathon MVP, not an approved government decision system. AI can misunderstand dialects, locations, urgency or context. Officers must verify category, priority and routing; never deny a service based on an AI output. Emergency cases must use official emergency channels, not wait for this portal. Do not send real sensitive personal information to an unapproved AI environment. Before a real deployment, complete department-approved privacy/security review, officer authentication and role-based access, private authenticated attachment delivery, malware scanning for uploads, encryption, retention/deletion policy, abuse controls, protected audit logs, independent language and triage evaluation, appeal/escalation paths, backups, monitoring and approved department integrations. The current hackathon MVP does not include officer login or file malware scanning; do not expose it to the public internet with real citizen data until these controls are added.

## Pitch

**JANSETU AI — One front door. Understand every voice. Route with accountability.** A multilingual GenAI-assisted grievance intake layer that helps officers understand, summarise and route citizen concerns while keeping decisions with authorised humans.

MIT License.