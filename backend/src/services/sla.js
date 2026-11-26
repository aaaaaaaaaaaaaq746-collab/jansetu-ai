export const SLA_HOURS={normal:72,high:24,critical:4};
export const slaDeadline=(priority,from=new Date())=>new Date(from.getTime()+(SLA_HOURS[priority]||72)*3600000);

export async function escalateOverdueCases(Complaint,now=new Date()){
 const overdue=await Complaint.find({status:{$nin:["resolved","rejected"]},dueAt:{$lte:now},escalated:{$ne:true}}).limit(250);
 let escalated=0;
 for(const doc of overdue){
  if(doc.priority==="critical"){
   doc.escalated=true;doc.escalatedAt=now;doc.escalationLevel=(doc.escalationLevel||0)+1;
   doc.audit.push({action:"sla_escalated",detail:"Critical grievance exceeded its SLA; flagged for senior officer intervention."});
  }else{
   const previous=doc.priority;doc.priority=previous==="normal"?"high":"critical";
   doc.escalationLevel=(doc.escalationLevel||0)+1;doc.dueAt=slaDeadline(doc.priority,now);
   doc.audit.push({action:"sla_escalated",detail:"SLA breached: priority automatically escalated from "+previous+" to "+doc.priority+"; new response deadline set."});
  }
  await doc.save();escalated++;
 }
 return escalated;
}
