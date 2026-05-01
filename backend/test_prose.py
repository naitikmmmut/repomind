import re

answer = """This sequence diagram shows the following interactions: 1. The client requests to access the application. 2. The load balancer forwards the request.
```mermaid
sequenceDiagram
A->>B: 1. Request
B->>A: 2. Response
```
And then it does other things. * Item 1 * Item 2 - Item 3"""

blocks = answer.split("```")
for i in range(0, len(blocks), 2):
    # Even indices are outside code blocks
    blocks[i] = re.sub(r'(?<!\n)\s+(\d+\.\s+)', r'\n\n\1', blocks[i])
    blocks[i] = re.sub(r'(?<!\n)\s+([*-]\s+)', r'\n\n\1', blocks[i])

answer = "```".join(blocks)
print(answer)
