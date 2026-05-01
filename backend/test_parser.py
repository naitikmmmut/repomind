import re

def fix_mermaid_output(answer: str) -> str:
    answer = answer.replace("|>", "|")
    
    block_match = re.search(r'```mermaid\s*(.*?)\s*```', answer, re.DOTALL | re.IGNORECASE)
    
    if block_match:
        raw_code = block_match.group(1)
        code = raw_code
        for kw in ['participant', 'actor', 'Note', 'loop', 'alt', 'else', 'opt', 'par', 'rect', 'critical', 'activate', 'deactivate', 'style', 'classDef', 'subgraph', 'direction']:
            code = re.sub(r'(?<!\n)\s+(' + kw + r'\b)', r'\n\1', code)
        code = re.sub(r'(?<!\n)\s+([A-Za-z0-9_]+\s*(?:->>|-->|-->>|->))', r'\n\1', code)
        code = re.sub(r'(?<!\n)\s+([A-Za-z0-9_]+\[.*?\]\s*(?:-->|->|-.->))', r'\n\1', code)
        code = re.sub(r'(?<!\n)\s+(end\b)', r'\n\1', code)
        
        return answer.replace(block_match.group(0), f"```mermaid\n{code.strip()}\n```")
    else:
        match = re.search(r'(mermaid\s+(?:sequenceDiagram|graph|flowchart|classDiagram).*?)(?=\s+(?:This |Here |The |Note:|Please |Based |In this )|$)', answer, re.IGNORECASE)
        
        if not match:
            return answer

        raw_block = match.group(1).strip()
        prose = answer[match.end():].strip()
        
        code = re.sub(r'^mermaid\s+', '', raw_block, flags=re.IGNORECASE)
        
        for kw in ['participant', 'actor', 'Note', 'loop', 'alt', 'else', 'opt', 'par', 'rect', 'critical', 'activate', 'deactivate', 'style', 'classDef', 'subgraph', 'direction']:
            code = re.sub(r'(?<!\n)\s+(' + kw + r'\b)', r'\n\1', code)
            
        code = re.sub(r'(?<!\n)\s+([A-Za-z0-9_]+\s*(?:->>|-->|-->>|->))', r'\n\1', code)
        code = re.sub(r'(?<!\n)\s+([A-Za-z0-9_]+\[.*?\]\s*(?:-->|->|-.->))', r'\n\1', code)
        code = re.sub(r'(?<!\n)\s+(end\b)', r'\n\1', code)
        
        before = answer[:match.start()].strip()
        
        parts = []
        if before:
            parts.append(before)
        parts.append(f"```mermaid\n{code.strip()}\n```")
        if prose:
            parts.append(prose)
            
        return "\n\n".join(parts)

test1 = 'Architecture Sequence Diagram mermaid sequenceDiagram participant Client as "Client" participant API as "API Gateway" Client->>API: 1. Request API->>Client: 2. Response This is the prose.'
print("=== TEST 1 ===")
print(fix_mermaid_output(test1))

test3 = 'Architecture Sequence Diagram mermaid sequenceDiagram participant Client as "Client Application" participant API as "API Gateway" participant Service as "Debug Service" participant Database as "Database" participant Logger as "Logger" participant Monitor as "Monitor" participant Cache as "Cache" participant LoadBalancer as "Load Balancer" participant Server as "Server" Note over Client,API: Client sends request to API API->>LoadBalancer: Forward request to Load Balancer LoadBalancer->>Server: Forward request to Server Server->>Service: Forward request to Debug Service Service->>Cache: Check cache for debug data Cache->>Service: Return cache result Service->>Database: Retrieve debug data from database Database->>Service: Return debug data Service->>Logger: Log debug data Logger->>Service: Return log result Service->>Cache: Update cache with debug data Cache->>Service: Return cache update result Service->>Server: Return debug data to Server Server->>LoadBalancer: Return debug data to Load Balancer LoadBalancer->>API: Return debug data to API API->>Client: Return debug data to Client This diagram illustrates the flow.'
print("\n=== TEST 3 ===")
print(fix_mermaid_output(test3))

test4 = 'Here is the diagram: ```mermaid sequenceDiagram participant A participant B A->>B: 1. Request B->>A: 2. Response ``` It works.'
print("\n=== TEST 4 ===")
print(fix_mermaid_output(test4))
