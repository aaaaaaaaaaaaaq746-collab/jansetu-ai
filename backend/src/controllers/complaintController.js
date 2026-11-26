import path from "node:path";
import Complaint from "../models/Complaint.js";
import {triage,similarity} from "../services/triage.js";
import {analyzeComplaint,draftCitizenReply} from "../services/ai.js";
import {slaDeadline,escalateOverdueCases} from "../services/sla.js";
const ref=()=>"JS-"+Math.random().toString(16).slice(2,10).toUpperCase();
const escapeRegex=value=>String(value).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
const openFilter={status:{$nin:["resolved","rejected"]}};
export async function analyzeIntake(req,res,next){
 try{const {description,district,location}=req.body;if(typeof description!=="string"||description.trim().length<12||description.length>3000)return res.status(400).json({message:"Enter a complaint between 12 and 3000 characters."});res.json(await analyzeComplaint(description.trim(),{district,location}))}catch(e){next(e)}
}
export async function createComplaint(req,res,next){
 try{
  const {name,phone,district,location,description,consent}=req.body;
  if(consent!==true)return res.status(400).json({message:"Consent is required."});
  for(const [key,value,min,max] of [["name",name,2,100],["phone",phone,7,20],["district",district,2,80],["location",location,2,200],["description",description,12,3000]])
   if(typeof value!=="string"||value.trim().length<min||value.trim().length>max)return res.status(400).json({message:"Please provide a valid "+key+"."});
  let ai;try{ai=await analyzeComplaint(description.trim(),{district,location})}catch(error){console.error("AI intake fallback:",error.message);ai=null}
  const result=ai||{...triage(description),summary:description.slice(0,240),routingReason:triage(description).reason,suggestedAction:"Officer review required",citizenReplyDraft:"Your grievance has been registered. An officer will review it.",aiUsed:false,requiresHumanReview:true};
  const recent=await Complaint.find({}).select("reference description duplicateGroupId").sort({createdAt:-1}).limit(250).lean();
  const matches=recent.map(x=>({id:x.reference,group:x.duplicateGroupId,score:similarity(description,x.description)})).filter(x=>x.score>=.25).sort((a,b)=>b.score-a.score).slice(0,5);
  const duplicate=matches.find(x=>x.score>=.55);
  const doc=await Complaint.create({reference:ref(),name:name.trim(),phone:phone.trim(),district:district.trim(),location:location.trim(),description:description.trim(),...result,reason:result.routingReason,dueAt:slaDeadline(result.priority),duplicateGroupId:duplicate?(duplicate.group||duplicate.id):null,audit:[{action:"created",detail:"Citizen submitted grievance"},{action:"ai_triage",detail:result.aiUsed?"AI analysis generated; officer review required":"Rules-based fallback used"},...(duplicate?[{action:"duplicate_detected",detail:"Potential duplicate of "+duplicate.id+" ("+Math.round(duplicate.score*100)+"% text similarity). Linked for officer review."}]:[])]});
  res.status(201).json({id:doc.reference,language:doc.language,category:doc.category,department:doc.department,priority:doc.priority,confidence:doc.confidence,reason:doc.reason,summary:doc.aiSummary||doc.description.slice(0,240),routingReason:doc.routingReason,suggestedAction:doc.suggestedAction,aiUsed:doc.aiUsed,requiresHumanReview:true,emergencyFlag:doc.emergencyFlag,status:doc.status,dueAt:doc.dueAt,duplicateGroupId:doc.duplicateGroupId,similarCases:matches,message:"Your grievance has been registered. An officer will review the suggested routing."});
 }catch(e){next(e)}
}
export async function draftReply(req,res,next){
 try{const doc=await Complaint.findOne({reference:req.params.id});if(!doc)return res.status(404).json({message:"Case not found"});const reply=await draftCitizenReply(doc,{status:req.body.status,officerNote:req.body.officerNote});res.json({reply,aiUsed:Boolean(process.env.OPENAI_API_KEY),requiresOfficerApproval:true})}catch(e){next(e)}
}
export async function listComplaints(req,res,next){
 try{
  await escalateOverdueCases(Complaint);
  const {status,priority,district,q}=req.query,filter={};
  if(status)filter.status=status;if(priority)filter.priority=priority;if(district)filter.district=district;
  if(q){const safe=escapeRegex(String(q).slice(0,100));filter.$or=["reference","description","name","district"].map(k=>({[k]:{$regex:safe,$options:"i"}}))}
  const rows=await Complaint.find(filter).sort({createdAt:-1}).limit(500).lean();
  res.json(rows.map(({_id,__v,...x})=>({...x,id:x.reference})));
 }catch(e){next(e)}
}
export async function getComplaint(req,res,next){
 try{
  const row=await Complaint.findOne({reference:req.params.id}).lean();if(!row)return res.status(404).json({message:"Case not found"});
  const group=row.duplicateGroupId||row.reference;\n  const others=await Complaint.find({_id:{$ne:row._id},$or:[{duplicateGroupId:group},{reference:group}]}).select("reference district status priority description createdAt").limit(30).lean();
  const similarCases=others.map(x=>({id:x.reference,district:x.district,status:x.status,priority:x.priority,score:similarity(row.description,x.description)}));
  const {_id,__v,...data}=row;res.json({...data,id:row.reference,similarCases});
 }catch(e){next(e)}
}
export async function updateComplaint(req,res,next){
 try{
  const allowed={status:["received","triaged","assigned","in_progress","resolved","rejected"],priority:["normal","high","critical"]},updates={};
  for(const k of ["status","priority","department","assignedTo"])if(req.body[k]!==undefined)updates[k]=String(req.body[k]).slice(0,120);
  for(const [k,values] of Object.entries(allowed))if(updates[k]&&!values.includes(updates[k]))return res.status(400).json({message:"Invalid "+k});
  if(!Object.keys(updates).length&&!req.body.note)return res.status(400).json({message:"No changes supplied"});
  const doc=await Complaint.findOne({reference:req.params.id});if(!doc)return res.status(404).json({message:"Case not found"});
  for(const [k,v] of Object.entries(updates)){const previous=doc[k];doc[k]=v;if(k==="priority"&&previous!==v){doc.dueAt=slaDeadline(v);doc.escalated=false;doc.escalatedAt=undefined;doc.audit.push({action:"sla_reset",detail:"Priority changed; SLA deadline recalculated."})}if(k==="status"&&v==="resolved")doc.resolvedAt=new Date();doc.audit.push({action:"updated",actor:"officer",detail:k+" changed to "+v})}
  if(req.body.note)doc.audit.push({action:"note",actor:"officer",detail:String(req.body.note).slice(0,500)});
  await doc.save();res.json({...doc.toObject(),id:doc.reference});
 }catch(e){next(e)}
}
export async function trackComplaint(req,res,next){
 try{const d=await Complaint.findOne({reference:req.params.id}).select("reference status priority department createdAt updatedAt dueAt escalated escalationLevel").lean();if(!d)return res.status(404).json({message:"Case not found"});res.json({...d,id:d.reference})}catch(e){next(e)}
}
export async function uploadAttachments(req,res,next){
 try{
  const doc=await Complaint.findOne({reference:req.params.id});if(!doc)return res.status(404).json({message:"Case not found"});
  if(!req.files?.length)return res.status(400).json({message:"Choose at least one supported file."});
  for(const file of req.files)doc.attachments.push({originalName:file.originalname.slice(0,180),fileName:file.filename,mimeType:file.mimetype,size:file.size});
  doc.audit.push({action:"evidence_uploaded",actor:"citizen",detail:req.files.length+" evidence file(s) attached."});
  await doc.save();res.status(201).json({attachments:doc.attachments.map(a=>({id:a._id,originalName:a.originalName,mimeType:a.mimeType,size:a.size,uploadedAt:a.uploadedAt})),message:"Evidence uploaded successfully."});
 }catch(e){next(e)}
}
export async function downloadAttachment(req,res,next){
 try{
  const doc=await Complaint.findOne({reference:req.params.id});if(!doc)return res.status(404).json({message:"Case not found"});
  const file=doc.attachments.id(req.params.attachmentId);if(!file)return res.status(404).json({message:"Attachment not found"});
  const root=path.resolve(process.env.UPLOAD_DIR||"uploads"),target=path.resolve(root,file.fileName);
  if(!target.startsWith(root+path.sep))return res.status(400).json({message:"Invalid file path"});
  res.download(target,file.originalName);
 }catch(e){next(e)}
}
async function aggregateDistricts(){
 return Complaint.aggregate([{$group:{_id:"$district",total:{$sum:1},open:{$sum:{$cond:[{$not:[{$in:["$status",["resolved","rejected"]]}]},1,0]}},critical:{$sum:{$cond:[{$eq:["$priority","critical"]},1,0]}},resolved:{$sum:{$cond:[{$eq:["$status","resolved"]},1,0]}}}},{$sort:{total:-1,_id:1}},{$limit:100}]);
}
export async function analytics(req,res,next){
 try{
  await escalateOverdueCases(Complaint);
  const [total,statuses,priorities,departments,byDistrict,byCategory,overdue,duplicates]=await Promise.all([
   Complaint.countDocuments(),Complaint.aggregate([{$group:{_id:"$status",n:{$sum:1}}}]),Complaint.aggregate([{$group:{_id:"$priority",n:{$sum:1}}}]),Complaint.aggregate([{$group:{_id:"$department",n:{$sum:1}}}]),aggregateDistricts(),Complaint.aggregate([{$group:{_id:"$category",n:{$sum:1}}}]),Complaint.countDocuments({...openFilter,dueAt:{$lt:new Date()}}),Complaint.countDocuments({duplicateGroupId:{$ne:null}})
  ]);
  const map=rows=>Object.fromEntries(rows.map(x=>[x._id,x.n]));res.json({total,byStatus:map(statuses),byPriority:map(priorities),byDepartment:map(departments),byCategory:map(byCategory),byDistrict,overdue,duplicateLinked:duplicates});
 }catch(e){next(e)}
}
export async function publicStats(req,res,next){
 try{
  await escalateOverdueCases(Complaint);
  const [total,resolved,open,byDistrict,byCategory,byDepartment]=await Promise.all([
   Complaint.countDocuments(),Complaint.countDocuments({status:"resolved"}),Complaint.countDocuments(openFilter),aggregateDistricts(),
   Complaint.aggregate([{$group:{_id:"$category",count:{$sum:1}}},{$sort:{count:-1}}]),
   Complaint.aggregate([{$group:{_id:"$department",count:{$sum:1}}},{$sort:{count:-1}}])
  ]);
  const resolutionRate=total?Math.round(resolved/total*100):0;
  res.json({total,resolved,open,resolutionRate,byDistrict,byCategory,byDepartment,updatedAt:new Date()});
 }catch(e){next(e)}
}
