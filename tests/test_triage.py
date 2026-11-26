from app.triage import triage, similarity, detect_language

def test_hindi_water_routes_to_water_department():
    result = triage("हमारे मोहल्ले में दो दिन से पानी नहीं आ रहा है")
    assert result["language"] == "hi"
    assert result["category"] == "water"
    assert "Water" in result["department"]
    assert result["priority"] == "high"

def test_sparking_transformer_is_critical():
    result = triage("Transformer is sparking near a school and there is a fire risk")
    assert result["category"] == "electricity"
    assert result["priority"] == "critical"
    assert result["emergency_flag"] is True

def test_default_is_other():
    result = triage("Please help me with an issue in my neighbourhood")
    assert result["category"] == "other"
    assert result["confidence"] < .5

def test_similarity():
    assert similarity("broken road near school", "road broken near school") > .5
    assert similarity("water supply issue", "pension certificate") == 0

def test_language():
    assert detect_language("नमस्ते") == "hi"
    assert detect_language("Hello there") == "en"
