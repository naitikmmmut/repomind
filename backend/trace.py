import re

def parse(answer):
    print("--- INPUT ---")
    print(answer)
    print("-------------")
    
    answer = answer.replace("|>", "|")
    block_match = re.search(r'```mermaid\s*(.*?)\s*```', answer, re.DOTALL | re.IGNORECASE)
    
    if block_match:
        print("MATCHED BLOCK")
        raw_code = block_match.group(1)
        code = raw_code
        code = code.replace('```', '')
        for kw in ['participant', 'actor', 'Note', 'loop', 'alt', 'else', 'opt', 'par', 'rect', 'critical', 'activate', 'deactivate', 'style', 'classDef', 'subgraph', 'direction']:
            code = re.sub(r'(?<!\n)\s+(' + kw + r'\b)', r'\n\1', code)
        code = re.sub(r'(?<!\n)\s+([A-Za-z0-9_]+\s*(?:->>|-->|-->>|->))', r'\n\1', code)
        code = re.sub(r'(?<!\n)\s+([A-Za-z0-9_]+\[.*?\]\s*(?:-->|->|-.->))', r'\n\1', code)
        code = re.sub(r'(?<!\n)\s+(end\b)', r'\n\1', code)
        
        answer = answer.replace(block_match.group(0), f"\n\n```mermaid\n{code.strip()}\n```\n\n")
    else:
        print("MATCHED ELSE")
        match = re.search(r'(mermaid\s+(?:sequenceDiagram|graph|flowchart|classDiagram).*?)(?=\s+(?:This |Here |The |Note:|Please |Based |In this )|$)', answer, re.IGNORECASE)
        
        if match:
            raw_block = match.group(1).strip()
            prose = answer[match.end():].strip()
            
            code = re.sub(r'^mermaid\s+', '', raw_block, flags=re.IGNORECASE)
            code = code.replace('```', '')
            
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
                
            answer = "\n\n".join(parts)
            
    print("--- OUTPUT ---")
    print(answer)

test_str = 'Debug User Flow Sequence ```mermaid sequenceDiagram participant User as "User" participant Client as "Client Application" participant Logger as "Logger Module" participant Formatter as "Formatter Module" participant Transport as "Transport Module" participant Output as "Output Destination" Note over User,Client: User interacts with Client Application User->>Client: Perform action Client->>Logger: Log message Logger->>Formatter: Format log message Formatter->>Logger: Return formatted message Logger->>Transport: Send log message Transport->>Output: Write log message Output->>Transport: Confirm write Transport->>Logger: Confirm send Logger->>Client: Confirm log Client->>User: Display confirmation User->>Client: View logs Client->>Logger: Retrieve logs Logger->>Transport: Retrieve logs Transport->>Output: Retrieve logs Output->>Transport: Return logs Transport->>Logger: Return logs Logger->>Client: Return logs Client->>User: Display logs ``` This sequence diagram illustrates the user flow of the debug logging system. The user interacts with the Client Application'
parse(test_str)
