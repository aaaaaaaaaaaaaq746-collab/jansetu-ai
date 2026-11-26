import "dotenv/config";
import app from "./app.js";
import {connectDB} from "./config/db.js";
const port=process.env.PORT||5000;
connectDB().then(()=>app.listen(port,()=>console.log("JANSETU API listening on "+port))).catch(e=>{console.error("Startup failed:",e.message);process.exit(1)});
