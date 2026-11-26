import {Router} from "express";
import * as c from "../controllers/complaintController.js";
const r=Router();
r.post("/ai/analyze",c.analyzeIntake);r.post("/:id/draft-reply",c.draftReply);
r.post("/",c.createComplaint);r.get("/",c.listComplaints);r.get("/analytics",c.analytics);r.get("/track/:id",c.trackComplaint);r.get("/:id",c.getComplaint);r.patch("/:id",c.updateComplaint);
export default r;
