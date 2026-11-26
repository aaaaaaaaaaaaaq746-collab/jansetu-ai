const categories = {
 water:{terms:["water","pipeline","tap","supply","leak","sewer","drain","जल","पानी","नल","सीवर","नाली","पाइपलाइन"],department:"Jal Shakti / Water Supply"},
 electricity:{terms:["electricity","power","transformer","wire","streetlight","बिजली","ट्रांसफार्मर","तार","लाइट"],department:"Energy Department"},
 roads:{terms:["road","pothole","street","bridge","footpath","सड़क","गड्ढा","पुल","फुटपाथ"],department:"Public Works Department"},
 sanitation:{terms:["garbage","waste","rubbish","cleaning","toilet","कचरा","सफाई","शौचालय","गंदगी"],department:"Urban Development / Local Body"},
 health:{terms:["hospital","clinic","ambulance","medicine","health","doctor","अस्पताल","दवा","डॉक्टर","स्वास्थ्य","एम्बुलेंस"],department:"Health & Family Welfare"},
 safety:{terms:["violence","threat","fire","collapse","accident","unsafe","assault","आग","हिंसा","धमकी","दुर्घटना","खतरा"],department:"District Administration / Emergency Services"},
 documents:{terms:["certificate","pension","ration","benefit","application","दस्तावेज","प्रमाणपत्र","पेंशन","राशन","आवेदन"],department:"Revenue / Social Welfare"},
 other:{terms:[],department:"District Grievance Cell"}
};
const emergencyTerms=["fire","violence","threat","collapse","accident","trapped","life at risk","आग","हिंसा","धमकी","दुर्घटना","जान का खतरा","फंसा"];
const urgentTerms=["no water","no electricity","outage","overflow","hospital","ambulance","पानी नहीं","बिजली नहीं","अस्पताल","एम्बुलेंस","ओवरफ्लो"];
export function detectLanguage(text){return /[\u0900-\u097F]/u.test(text)?"hi":"en"}
export function triage(text){
 const clean=text.trim().replace(/\s+/g," "), lower=clean.toLocaleLowerCase();
 const ranked=Object.entries(categories).map(([category,cfg])=>({category,hits:cfg.terms.filter(t=>lower.includes(t.toLocaleLowerCase()))})).filter(x=>x.hits.length).sort((a,b)=>b.hits.length-a.hits.length);
 const category=ranked[0]?.category||"other", emergency=emergencyTerms.filter(t=>lower.includes(t.toLocaleLowerCase())), urgent=urgentTerms.filter(t=>lower.includes(t.toLocaleLowerCase()));
 const confidence=ranked.length?Math.min(.98,.55+ranked[0].hits.length/Math.max(1,ranked.reduce((n,x)=>n+x.hits.length,0))*.4):.35;
 return {language:detectLanguage(clean),category,department:categories[category].department,priority:emergency.length?"critical":urgent.length?"high":"normal",confidence:Number(confidence.toFixed(2)),emergencyFlag:Boolean(emergency.length),reason:(ranked.length?"Matched topic terms: "+ranked[0].hits.slice(0,4).join(", "):"No known topic terms matched")+"; "+(emergency.length?"Potential immediate safety risk detected; human emergency review required":urgent.length?"Service disruption / time-sensitive term detected":"No explicit emergency phrase detected")};
}
export function similarity(a,b){
 const tokens=s=>new Set((s.toLocaleLowerCase().match(/[a-z0-9\u0900-\u097f]+/gu)||[]).filter(x=>x.length>2));
 const aa=tokens(a),bb=tokens(b); if(!aa.size||!bb.size)return 0;
 let common=0;for(const t of aa)if(bb.has(t))common++;
 return Number((common/new Set([...aa,...bb]).size).toFixed(3));
}
