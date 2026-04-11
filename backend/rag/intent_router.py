INTENT_KEYWORDS = {
    "explain": [
        "explain", "how does", "what does", "walk me through",
        "describe", "what is", "how is", "tell me about",
        "show me", "understand", "clarify", "detail"
    ],
    "bug": [
        "bug", "issue", "error", "problem", "fix", "vulnerability",
        "security", "wrong", "broken", "crash", "fail", "leak",
        "race condition", "null", "exception", "antipattern"
    ],
    "architecture": [
        "architecture", "structure", "design", "pattern", "organize",
        "layout", "diagram", "overview", "folder", "module",
        "tech stack", "dependency", "flow", "how is.*organized"
    ],
}

def detect_intent(query: str) -> str:
    query_lower = query.lower()

    scores = {"explain": 0, "bug": 0, "architecture": 0}

    for intent, keywords in INTENT_KEYWORDS.items():
        for kw in keywords:
            if kw in query_lower:
                scores[intent] += 1

    best = max(scores, key=scores.get)
    if scores[best] > 0:
        return best
    return "general"
