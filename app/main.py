"""JANSETU AI API and lightweight web application."""
from __future__ import annotations
import os, sqlite3, uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from .triage import triage, similarity

ROOT = Path(__file__).resolve().parent
DB_PATH = os.getenv("JANSETU_DB_PATH", str(ROOT.parent / "jansetu.db"))
app = FastAPI(title="JANSETU AI", description="Bilingual grievance intake, explainable triage and accountable routing.", version="1.0.0")
app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")

class ComplaintIn(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=7, max_length=20)
    district: str = Field(min_length=2, max_length=80)
    location: str = Field(min_length=2, max_length=200)
    description: str = Field(min_length=12, max_length=3000)
    consent: bool = True

class UpdateIn(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    department: Optional[str] = None
    priority: Optional[str] = None
    note: Optional[str] = None

def connect():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    return db

def init_db():
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    with connect() as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS complaints (
          id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL,
          district TEXT NOT NULL, location TEXT NOT NULL, description TEXT NOT NULL,
          language TEXT, category TEXT, department TEXT, priority TEXT,
          confidence REAL, reason TEXT, emergency_flag INTEGER DEFAULT 0,
          status TEXT DEFAULT 'received', assigned_to TEXT DEFAULT '',
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS audit (
          id INTEGER PRIMARY KEY AUTOINCREMENT, complaint_id TEXT NOT NULL,
          action TEXT NOT NULL, actor TEXT NOT NULL, detail TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        """)

def now():
    return datetime.now(timezone.utc).isoformat()

def rowdict(row):
    d = dict(row)
    d["emergency_flag"] = bool(d.get("emergency_flag"))
    return d

def add_audit(db, cid, action, detail, actor="system"):
    db.execute("INSERT INTO audit(complaint_id,action,actor,detail,created_at) VALUES(?,?,?,?,?)",
               (cid, action, actor, detail, now()))

@app.on_event("startup")
def startup():
    init_db()
    if os.getenv("JANSETU_DEMO_MODE", "true").lower() == "true":
        seed_demo()

def seed_demo():
    with connect() as db:
        if db.execute("SELECT COUNT(*) FROM complaints").fetchone()[0]:
            return
        demos = [
          ("Ravi Kumar","9876501234","Lucknow","Aliganj","There has been no water supply in our lane for two days. पानी नहीं आ रहा है।"),
          ("Sana Khan","9876505678","Kanpur Nagar","Civil Lines","A large pothole on the main road is causing accidents and vehicles are damaged."),
          ("Amit Verma","9876509876","Varanasi","Lanka","Garbage has not been collected for a week and there is a bad smell."),
          ("Priya Singh","9876511111","Meerut","Shastri Nagar","Transformer is sparking and wires are hanging near the school. आग लगने का खतरा है।"),
        ]
        for name, phone, district, location, desc in demos:
            result = triage(desc); cid = "JS-" + uuid.uuid4().hex[:8].upper(); stamp = now()
            db.execute("""INSERT INTO complaints(id,name,phone,district,location,description,language,category,department,priority,confidence,reason,emergency_flag,status,created_at,updated_at)
              VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
              (cid,name,phone,district,location,desc,result["language"],result["category"],result["department"],result["priority"],result["confidence"],result["reason"],int(result["emergency_flag"]),"received",stamp,stamp))
            add_audit(db,cid,"created","Demo case created")

@app.get("/")
def home():
    return FileResponse(ROOT / "static" / "index.html")

@app.get("/api/health")
def health():
    return {"status":"ok","service":"jansetu-ai","version":"1.0.0"}

@app.post("/api/complaints", status_code=201)
def create_complaint(payload: ComplaintIn):
    if not payload.consent:
        raise HTTPException(400, "Consent is required to store this grievance.")
    result = triage(payload.description)
    cid = "JS-" + uuid.uuid4().hex[:8].upper(); stamp = now()
    with connect() as db:
        db.execute("""INSERT INTO complaints(id,name,phone,district,location,description,language,category,department,priority,confidence,reason,emergency_flag,status,created_at,updated_at)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
          (cid,payload.name,payload.phone,payload.district,payload.location,payload.description,result["language"],result["category"],result["department"],result["priority"],result["confidence"],result["reason"],int(result["emergency_flag"]),"received",stamp,stamp))
        add_audit(db,cid,"created","Citizen submitted grievance")
        candidates = db.execute("SELECT id,description FROM complaints WHERE id != ? ORDER BY created_at DESC LIMIT 100",(cid,)).fetchall()
        similar = [{"id":r["id"],"score":similarity(payload.description,r["description"])} for r in candidates]
        similar = sorted([x for x in similar if x["score"] >= 0.25], key=lambda x:x["score"], reverse=True)[:3]
    return {"id":cid, **result, "status":"received", "similar_cases":similar,
            "message":"Your grievance has been registered. An officer will review the suggested routing."}

@app.get("/api/complaints")
def list_complaints(status: Optional[str]=None, priority: Optional[str]=None, district: Optional[str]=None,
                    q: Optional[str]=Query(default=None, max_length=100), limit: int=Query(100, ge=1, le=500)):
    sql = "SELECT * FROM complaints WHERE 1=1"; args = []
    for col, val in [("status",status),("priority",priority),("district",district)]:
        if val: sql += f" AND {col}=?"; args.append(val)
    if q:
        sql += " AND (id LIKE ? OR description LIKE ? OR name LIKE ?)"; args.extend([f"%{q}%"]*3)
    sql += " ORDER BY CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END, created_at DESC LIMIT ?"; args.append(limit)
    with connect() as db:
        rows = db.execute(sql,args).fetchall()
    return [rowdict(r) for r in rows]

@app.get("/api/complaints/{complaint_id}")
def get_complaint(complaint_id: str):
    with connect() as db:
        row = db.execute("SELECT * FROM complaints WHERE id=?",(complaint_id,)).fetchone()
        if not row: raise HTTPException(404,"Case not found")
        events = db.execute("SELECT action,actor,detail,created_at FROM audit WHERE complaint_id=? ORDER BY id DESC",(complaint_id,)).fetchall()
        others = db.execute("SELECT id,description FROM complaints WHERE id != ? LIMIT 100",(complaint_id,)).fetchall()
    case = rowdict(row)
    case["similar_cases"] = sorted([{"id":r["id"],"score":similarity(case["description"],r["description"])} for r in others if similarity(case["description"],r["description"]) >= .25],key=lambda x:x["score"],reverse=True)[:5]
    case["audit"] = [dict(e) for e in events]
    return case

@app.patch("/api/complaints/{complaint_id}")
def update_complaint(complaint_id: str, payload: UpdateIn):
    allowed = {"status":{"received","triaged","assigned","in_progress","resolved","rejected"},
               "priority":{"normal","high","critical"}}
    updates = payload.model_dump(exclude_none=True)
    if not updates: raise HTTPException(400,"No changes supplied")
    for key, choices in allowed.items():
        if key in updates and updates[key] not in choices: raise HTTPException(400,f"Invalid {key}")
    if "assigned_to" in updates and len(updates["assigned_to"]) > 100: raise HTTPException(400,"Assignee too long")
    with connect() as db:
        if not db.execute("SELECT 1 FROM complaints WHERE id=?",(complaint_id,)).fetchone(): raise HTTPException(404,"Case not found")
        note = updates.pop("note", "")
        for key, value in updates.items():
            db.execute(f"UPDATE complaints SET {key}=?, updated_at=? WHERE id=?",(value,now(),complaint_id))
            add_audit(db,complaint_id,"updated",f"{key} changed to {value}")
        if note: add_audit(db,complaint_id,"note",note,actor="officer")
        row = db.execute("SELECT * FROM complaints WHERE id=?",(complaint_id,)).fetchone()
    return rowdict(row)

@app.get("/api/analytics")
def analytics():
    with connect() as db:
        total = db.execute("SELECT COUNT(*) FROM complaints").fetchone()[0]
        by_status = {r["status"]:r["n"] for r in db.execute("SELECT status,COUNT(*) n FROM complaints GROUP BY status")}
        by_priority = {r["priority"]:r["n"] for r in db.execute("SELECT priority,COUNT(*) n FROM complaints GROUP BY priority")}
        by_department = {r["department"]:r["n"] for r in db.execute("SELECT department,COUNT(*) n FROM complaints GROUP BY department")}
    return {"total":total,"by_status":by_status,"by_priority":by_priority,"by_department":by_department}

@app.get("/api/track/{complaint_id}")
def track(complaint_id: str):
    with connect() as db:
        row = db.execute("SELECT id,status,priority,department,created_at,updated_at FROM complaints WHERE id=?",(complaint_id,)).fetchone()
    if not row: raise HTTPException(404,"Case not found")
    return dict(row)
