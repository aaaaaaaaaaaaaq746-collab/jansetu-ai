import mongoose from "mongoose";
const auditSchema = new mongoose.Schema({
  action:{type:String,required:true}, actor:{type:String,default:"system"},
  detail:{type:String,required:true}, createdAt:{type:Date,default:Date.now}
},{_id:false});
const schema = new mongoose.Schema({
  reference:{type:String,unique:true,index:true},
  name:{type:String,required:true,trim:true,maxlength:100},
  phone:{type:String,required:true,trim:true,maxlength:20},
  district:{type:String,required:true,trim:true,maxlength:80},
  location:{type:String,required:true,trim:true,maxlength:200},
  description:{type:String,required:true,trim:true,minlength:12,maxlength:3000},
  language:String,category:String,department:String,
  priority:{type:String,enum:["normal","high","critical"],default:"normal"},
  confidence:{type:Number,min:0,max:1},reason:String,
  emergencyFlag:{type:Boolean,default:false},
  status:{type:String,enum:["received","triaged","assigned","in_progress","resolved","rejected"],default:"received"},
  assignedTo:{type:String,default:""},audit:{type:[auditSchema],default:[]}
},{timestamps:true});
schema.index({district:1,status:1,priority:1,createdAt:-1});
export default mongoose.model("Complaint",schema);
