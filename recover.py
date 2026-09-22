import json
import re

transcript_path = "/Users/edassery/.gemini/antigravity-ide/brain/b3e3de7a-39e8-4d95-9164-2b36646b34dd/.system_generated/logs/transcript_full.jsonl"

files = {"style.css": "", "index.html": "", "script.js": ""}

with open(transcript_path) as f:
    for line in f:
        data = json.loads(line)
        if data.get("type") == "TOOL_RESPONSE":
            content = data.get("content", "")
            if "Total Lines:" in content and "Showing lines 1 to" in content:
                # Extract file name
                match = re.search(r"File Path: `file://(.*?)`", content)
                if match:
                    filepath = match.group(1)
                    filename = filepath.split("/")[-1]
                    if filename in files:
                        # Extract the actual file content by removing line numbers
                        lines = content.split("\n")
                        extracted = []
                        is_content = False
                        for l in lines:
                            if "The following code has been modified" in l:
                                is_content = True
                                continue
                            if "The above content shows the entire, complete file contents" in l or "The above content does NOT show the entire file contents" in l:
                                is_content = False
                            if is_content:
                                # Remove the line number prefix e.g., "1: "
                                extracted.append(re.sub(r"^\d+:\s", "", l))
                        if len(extracted) > 10:
                            files[filename] = "\n".join(extracted)

with open("style_recovered.css", "w") as f:
    f.write(files["style.css"])
with open("script_recovered.js", "w") as f:
    f.write(files["script.js"])
with open("index_recovered.html", "w") as f:
    f.write(files["index.html"])
