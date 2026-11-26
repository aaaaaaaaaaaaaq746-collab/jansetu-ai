import test from "node:test";
import assert from "node:assert/strict";
import {slaDeadline,SLA_HOURS} from "../src/services/sla.js";

test("SLA targets are defined for each priority",()=>{
 assert.deepEqual(SLA_HOURS,{normal:72,high:24,critical:4});
});
test("SLA deadline uses the priority response window",()=>{
 const start=new Date("2026-01-01T00:00:00.000Z");
 assert.equal(slaDeadline("normal",start).toISOString(),"2026-01-04T00:00:00.000Z");
 assert.equal(slaDeadline("high",start).toISOString(),"2026-01-02T00:00:00.000Z");
 assert.equal(slaDeadline("critical",start).toISOString(),"2026-01-01T04:00:00.000Z");
});
