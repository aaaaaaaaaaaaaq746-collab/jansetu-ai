import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const uploadDir=path.resolve(process.env.UPLOAD_DIR||"uploads");
fs.mkdirSync(uploadDir,{recursive:true});
const allowed=new Set(["image/jpeg","image/png","image/webp","application/pdf","text/plain"]);
const storage=multer.diskStorage({
 destination:(_req,_file,cb)=>cb(null,uploadDir),
 filename:(_req,file,cb)=>cb(null,crypto.randomUUID()+path.extname(file.originalname).toLowerCase().slice(0,10))
});
export const complaintUpload=multer({
 storage,limits:{fileSize:5*1024*1024,files:4},
 fileFilter:(_req,file,cb)=>allowed.has(file.mimetype)?cb(null,true):cb(new Error("Only JPG, PNG, WEBP, PDF and TXT files are allowed."))
});
