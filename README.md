# JANSETU AI — Universal Intake, Triage & Routing Engine

**AI Kaushal Hackathon · CM Office / IT & Electronics Department, Uttar Pradesh**

JANSETU AI turns unstructured citizen grievances into structured, traceable cases. It detects language, identifies topic and department, estimates urgency, surfaces possible duplicates, and gives officers a transparent queue to review and route cases.

> This repository is a working MVP. The included triage engine is deterministic and explainable (keyword + scoring based); it does not call a hosted LLM or claim government-system integration. Swap in an approved model/service behind the triage interface after validation and procurement.

## What works
- Citizen intake in English or Hindi (with transliteration-friendly keyword coverage), including contact and location fields.
- Automatic category, suggested department, priority, confidence, and human-readable rationale.
- High-risk safety flags for emergency review; the UI clearly tells citizens to use emergency services for immediate danger.
- Similar-case detection to help officers identify repeat complaints.
- Officer dashboard with filters, case detail, status updates, assignment, and routing.
- SQLite persistence, audit events, seeded demo cases, API docs, and tests.
- Responsive interface; no frontend build step.

## Quick start
Requires Python 3.10+.

```bash
python -m venv .venv
# Windows: .venv\\Scripts\\activate
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Open http://127.0.0.1:8000. API docs: http://127.0.0.1:8000/docs

Optional configuration:
```bash
export JANSETU_DB_PATH=./jansetu.db
export JANSETU_DEMO_MODE=true
```

## Demo flow
1. Open **Citizen portal**, submit a Hindi or English grievance.
2. Note the generated case ID and suggested department/priority.
3. Open **Officer dashboard**, inspect the case and similar cases.
4. Assign an officer and update status. Every change creates an audit event.

## Architecture
```
Citizen Web UI ── POST /api/complaints ──> Intake & validation
                                           │
                                    Triage engine
                             language / category / urgency
                                           │
                                  Duplicate matcher
                                           │
                                  SQLite case store
                                           │
Officer dashboard <── GET/PATCH APIs ── Routing & audit log
```

## API
- `POST /api/complaints` — submit a grievance
- `GET /api/complaints` — list/filter cases
- `GET /api/complaints/{id}` — case detail, similar cases, audit history
- `PATCH /api/complaints/{id}` — update status, assignee, department, priority
- `GET /api/analytics` — aggregate dashboard metrics
- `GET /api/health` — health check

## Responsible deployment checklist
Before production: integrate verified identity/consent and secure contact handling; add role-based access control, encryption at rest/in transit, retention policies, rate limiting, abuse controls, accessibility and language testing, human review, model evaluation, appeal/escalation paths, monitoring, backups, and department-approved integrations. Never use automated triage as the sole basis to deny service or delay emergency response. Do not submit real sensitive personal data to this demo.

## Project structure
- `app/triage.py`: explainable bilingual triage and duplicate similarity
- `app/main.py`: FastAPI endpoints and SQLite persistence
- `app/static/`: citizen and officer interface
- `tests/`: core triage and API tests

## Hackathon pitch
**JANSETU AI — One front door. Clear priority. Accountable resolution.** It creates a common intake layer across departments while keeping final decisions with authorised human officers. The MVP focuses on fast, transparent routing rather than opaque autonomous decision-making.

## License
MIT — see [LICENSE](LICENSE).
