import test from "node:test";
import assert from "node:assert/strict";
import {triage,similarity,detectLanguage} from "../src/services/triage.js";
test("Hindi water complaint routes correctly",()=>{const x=triage("हमारे मोहल्ले में दो दिन से पानी नहीं आ रहा है");assert.equal(x.language,"hi");assert.equal(x.category,"water");assert.match(x.department,/Water/);assert.equal(x.priority,"high")});
test("sparking transformer receives critical priority",()=>{const x=triage("Transformer is sparking near a school and there is a fire risk");assert.equal(x.category,"electricity");assert.equal(x.priority,"critical");assert.equal(x.emergencyFlag,true)});
test("unknown issue maps to other",()=>assert.equal(triage("Please help with a neighbourhood matter").category,"other"));
test("similarity uses token overlap",()=>{assert.ok(similarity("broken road near school","road broken near school")>.5);assert.equal(similarity("water supply","pension certificate"),0)});
test("language detection",()=>{assert.equal(detectLanguage("नमस्ते"),"hi");assert.equal(detectLanguage("Hello"),"en")});
