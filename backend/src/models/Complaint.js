import mongoose from "mongoose";
const auditSchema = new mongoose.Schema({
  action:{type:String,required:true}, actor:{type:String,default:"system"},
  detail:{type:String,required:true}, createdAt:{type:Date,default:Date.now}
},{_id:false});
const attachmentSchema=new mongoose.Schema({
  originalName:{type:String,required:true,maxlength:180},fileName:{type:String,required:true},
  mimeType:{type:String,required:true},size:{type:Number,required:true},uploadedAt:{type:Date,default:Date.now}
},{_id:true});
const schema = new mongoose.Schema({
  reference:{type:String,unique:true,index:true},
  name:{type:String,required:true,trim:true,maxlength:100},
  phone:{type:String,required:true,trim:true,maxlength:20},
  district:{type:String,required:true,trim:true,maxlength:80},
  location:{type:String,required:true,trim:true,maxlength:200},
  description:{type:String,required:true,trim:true,minlength:12,maxlength:3000},
  language:String,normalizedEnglish:String,category:String,department:String,
  priority:{type:String,enum:["normal","high","critical"],default:"normal"},
  confidence:{type:Number,min:0,max:1},reason:String,aiSummary:String,routingReason:String,
  suggestedAction:String,citizenReplyDraft:String,aiUsed:{type:Boolean,default:false},
  emergencyFlag:{type:Boolean,default:false},requiresHumanReview:{type:Boolean,default:true},
  status:{type:String,enum:["received","triaged","assigned","in_progress","resolved","rejected"],default:"received"},
  assignedTo:{type:String,default:""},
  dueAt:{type:Date,index:true},escalated:{type:Boolean,default:false},escalatedAt:Date,escalationLevel:{type:Number,default:0},
  duplicateGroupId:{type:String,index:true,default:null},attachments:{type:[attachmentSchema],default:[]},
  audit:{type:[auditSchema],default:[]}
},{timestamps:true});
schema.index({district:1,status:1,priority:1,createdAt:-1});
schema.index({district:1,category:1,status:1});
export default mongoose.model("Complaint",schema);
