"""Explainable bilingual triage engine for JANSETU AI MVP."""
from __future__ import annotations
import re
from collections import Counter

CATEGORIES = {
    "water": {"en": ["water", "pipeline", "tap", "supply", "leak", "sewer", "drain", "जल", "पानी", "नल", "सीवर", "नाली", "पाइपलाइन"],
              "department": "Jal Shakti / Water Supply"},
    "electricity": {"en": ["electricity", "power", "transformer", "wire", "streetlight", " बिजली", "बिजली", "ट्रांसफार्मर", "तार", "लाइट"],
                    "department": "Energy Department"},
    "roads": {"en": ["road", "pothole", "street", "bridge", "footpath", "सड़क", "गड्ढा", "पुल", "फुटपाथ"],
              "department": "Public Works Department"},
    "sanitation": {"en": ["garbage", "waste", "rubbish", "cleaning", "toilet", "कचरा", "सफाई", "शौचालय", "गंदगी"],
                   "department": "Urban Development / Local Body"},
    "health": {"en": ["hospital", "clinic", "ambulance", "medicine", "health", "doctor", "अस्पताल", "दवा", "डॉक्टर", "स्वास्थ्य", "एम्बुलेंस"],
               "department": "Health & Family Welfare"},
    "safety": {"en": ["violence", "threat", "fire", "collapse", "accident", "unsafe", "assault", "आग", "हिंसा", "धमकी", "दुर्घटना", "खतरा"],
               "department": "District Administration / Emergency Services"},
    "documents": {"en": ["certificate", "pension", "ration", "benefit", "application", " दस्तावेज", "प्रमाणपत्र", "पेंशन", "राशन", "आवेदन"],
                  "department": "Revenue / Social Welfare"},
    "other": {"en": [], "department": "District Grievance Cell"},
}
EMERGENCY_TERMS = ["fire", "violence", "threat", "collapse", "accident", "trapped", "life at risk",
                   "आग", "हिंसा", "धमकी", "दुर्घटना", "जान का खतरा", "फंसा"]
URGENT_TERMS = ["no water", "no electricity", "outage", "overflow", "hospital", "ambulance",
                "पानी नहीं", "बिजली नहीं", "अस्पताल", "एम्बुलेंस", "ओवरफ्लो"]

def detect_language(text: str) -> str:
    return "hi" if re.search(r"[\u0900-\u097F]", text) else "en"

def _contains(text: str, terms: list[str]) -> list[str]:
    lowered = text.lower()
    return [term for term in terms if term.lower() in lowered]

def triage(text: str) -> dict:
    clean = " ".join(text.strip().split())
    lang = detect_language(clean)
    scores = {}
    hits = {}
    for category, config in CATEGORIES.items():
        found = _contains(clean, config["en"])
        if found:
            scores[category] = len(found)
            hits[category] = found
    category = max(scores, key=scores.get) if scores else "other"
    total = sum(scores.values())
    confidence = round(min(0.98, 0.55 + (scores.get(category, 0) / max(total, 1)) * 0.4), 2) if scores else 0.35
    emergency = _contains(clean, EMERGENCY_TERMS)
    urgent = _contains(clean, URGENT_TERMS)
    priority = "critical" if emergency else "high" if urgent else "normal"
    reasons = []
    if hits.get(category):
        reasons.append("Matched topic terms: " + ", ".join(hits[category][:4]))
    if emergency:
        reasons.append("Potential immediate safety risk detected; human emergency review required")
    elif urgent:
        reasons.append("Service disruption / time-sensitive term detected")
    else:
        reasons.append("No explicit emergency phrase detected")
    return {
        "language": lang, "category": category,
        "department": CATEGORIES[category]["department"],
        "priority": priority, "confidence": confidence,
        "reason": "; ".join(reasons),
        "emergency_flag": bool(emergency),
    }

def similarity(a: str, b: str) -> float:
    def tokens(s):
        return {t for t in re.findall(r"[a-z0-9\u0900-\u097f]+", s.lower()) if len(t) > 2}
    aa, bb = tokens(a), tokens(b)
    return round(len(aa & bb) / len(aa | bb), 3) if aa and bb else 0.0
