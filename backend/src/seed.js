import "dotenv/config";
import mongoose from "mongoose";
import {connectDB} from "./config/db.js";
import Complaint from "./models/Complaint.js";
import {triage} from "./services/triage.js";
const demos=[
 ["Ravi Kumar","9876501234","Lucknow","Aliganj","There has been no water supply in our lane for two days. पानी नहीं आ रहा है।"],
 ["Sana Khan","9876505678","Kanpur Nagar","Civil Lines","A large pothole on the main road is causing accidents and vehicles are damaged."],
 ["Amit Verma","9876509876","Varanasi","Lanka","Garbage has not been collected for a week and there is a bad smell."],
 ["Priya Singh","9876511111","Meerut","Shastri Nagar","Transformer is sparking and wires are hanging near the school. आग लगने का खतरा है।"]
];
try{await connectDB();for(const [name,phone,district,location,description] of demos){const result=triage(description);await Complaint.updateOne({name,description},{$setOnInsert:{reference:"JS-"+Math.random().toString(16).slice(2,10).toUpperCase(),name,phone,district,location,description,...result,audit:[{action:"created",detail:"Demo case created"}]}},{upsert:true})}console.log("Demo complaints ready")}finally{await mongoose.disconnect()}
