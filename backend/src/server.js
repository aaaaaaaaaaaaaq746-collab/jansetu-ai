import "dotenv/config";
import app from "./app.js";
import {connectDB} from "./config/db.js";
import Complaint from "./models/Complaint.js";
import {escalateOverdueCases} from "./services/sla.js";
const port=process.env.PORT||5000;
connectDB().then(()=>{
 app.listen(port,()=>console.log("JANSETU API listening on "+port));
 escalateOverdueCases(Complaint).catch(e=>console.error("Initial SLA check failed:",e.message));
 setInterval(()=>escalateOverdueCases(Complaint).catch(e=>console.error("SLA monitor failed:",e.message)),60000).unref();
}).catch(e=>{console.error("Startup failed:",e.message);process.exit(1)});
