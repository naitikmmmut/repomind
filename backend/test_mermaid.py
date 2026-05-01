import re
import sys
sys.path.insert(0, '.')
from rag.retriever import _fix_mermaid_output

# Simulate exact LLM output (everything on one line, no backticks)
test = ('mermaid sequenceDiagram participant Client as "User Browser" '
        'participant API as "Debug API" participant Service as "Debug Service" '
        'participant DB as "Database" Client->>API: 1. Request '
        'API->>Service: 2. Forward Service->>DB: 3. Query '
        'DB->>Service: 4. Response Service->>API: 5. Return '
        'API->>Client: 6. Response This diagram shows the architecture.')

result = _fix_mermaid_output(test)
print("=== RESULT ===")
print(result)
print()
print("Has backticks:", "```mermaid" in result)
