import Complaint from "../models/Complaint.js";
import {triage,similarity} from "../services/triage.js";
const ref=()=>"JS-"+Math.random().toString(16).slice(2,10).toUpperCase();
export async function createComplaint(req,res,next){
 try{
  const {name,phone,district,location,description,consent}=req.body;
  if(consent!==true)return res.status(400).json({message:"Consent is required."});
  for(const [key,value,min,max] of [["name",name,2,100],["phone",phone,7,20],["district",district,2,80],["location",location,2,200],["description",description,12,3000]])
   if(typeof value!=="string"||value.trim().length<min||value.trim().length>max)return res.status(400).json({message:"Please provide a valid "+key+"."});
  const result=triage(description),doc=await Complaint.create({reference:ref(),name,phone,district,location,description,...result,audit:[{action:"created",detail:"Citizen submitted grievance"}]});
  const others=await Complaint.find({_id:{$ne:doc._id}}).select("reference description").sort({createdAt:-1}).limit(100).lean();
  const similarCases=others.map(x=>({id:x.reference,score:similarity(description,x.description)})).filter(x=>x.score>=.25).sort((a,b)=>b.score-a.score).slice(0,3);
  res.status(201).json({id:doc.reference,...result,status:doc.status,similarCases,message:"Your grievance has been registered. An officer will review the suggested routing."});
 }catch(e){next(e)}
}
export async function listComplaints(req,res,next){
 try{
  const {status,priority,district,q}=req.query,filter={};
  if(status)filter.status=status;if(priority)filter.priority=priority;if(district)filter.district=district;
  if(q)filter.$or=["reference","description","name"].map(k=>({[k]:{$regex:String(q).slice(0,100),$options:"i"}}));
  const rows=await Complaint.find(filter).sort({createdAt:-1}).limit(500).lean();
  res.json(rows.map(({_id,__v,...x})=>({...x,id:x.reference})));
 }catch(e){next(e)}
}
export async function getComplaint(req,res,next){
 try{
  const row=await Complaint.findOne({reference:req.params.id}).lean();if(!row)return res.status(404).json({message:"Case not found"});
  const others=await Complaint.find({_id:{$ne:row._id}}).select("reference description").limit(100).lean();
  const similarCases=others.map(x=>({id:x.reference,score:similarity(row.description,x.description)})).filter(x=>x.score>=.25).sort((a,b)=>b.score-a.score).slice(0,5);
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
  for(const [k,v] of Object.entries(updates)){doc[k]=v;doc.audit.push({action:"updated",actor:"officer",detail:k+" changed to "+v})}
  if(req.body.note)doc.audit.push({action:"note",actor:"officer",detail:String(req.body.note).slice(0,500)});
  await doc.save();res.json({...doc.toObject(),id:doc.reference});
 }catch(e){next(e)}
}
export async function trackComplaint(req,res,next){
 try{const d=await Complaint.findOne({reference:req.params.id}).select("reference status priority department createdAt updatedAt").lean();if(!d)return res.status(404).json({message:"Case not found"});res.json({...d,id:d.reference})}catch(e){next(e)}
}
export async function analytics(req,res,next){
 try{
  const [total,statuses,priorities,departments]=await Promise.all([Complaint.countDocuments(),Complaint.aggregate([{$group:{_id:"$status",n:{$sum:1}}}]),Complaint.aggregate([{$group:{_id:"$priority",n:{$sum:1}}}]),Complaint.aggregate([{$group:{_id:"$department",n:{$sum:1}}}])]);
  const map=rows=>Object.fromEntries(rows.map(x=>[x._id,x.n]));res.json({total,byStatus:map(statuses),byPriority:map(priorities),byDepartment:map(departments)});
 }catch(e){next(e)}
}
