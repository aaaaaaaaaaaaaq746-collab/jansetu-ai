import test from "node:test";
import assert from "node:assert/strict";
import {analyzeComplaint,draftCitizenReply} from "../src/services/ai.js";

test("AI intake falls back to explainable rules when no API key is configured",async()=>{
 const key=process.env.OPENAI_API_KEY;delete process.env.OPENAI_API_KEY;
 try{
  const result=await analyzeComplaint("गांव में पिछले दो दिन से पानी नहीं आ रहा है");
  assert.equal(result.aiUsed,false);
  assert.equal(result.category,"water");
  assert.equal(result.priority,"high");
  assert.equal(result.requiresHumanReview,true);
  assert.ok(result.summary);
 }finally{if(key!==undefined)process.env.OPENAI_API_KEY=key}
});

test("reply assistant provides a safe draft without an API key",async()=>{
 const key=process.env.OPENAI_API_KEY;delete process.env.OPENAI_API_KEY;
 try{
  const reply=await draftCitizenReply({reference:"JS-TEST1234",status:"in_progress",description:"Water supply issue",department:"Water Supply"});
  assert.match(reply,/JS-TEST1234/);
  assert.match(reply,/in progress/);
 }finally{if(key!==undefined)process.env.OPENAI_API_KEY=key}
});
