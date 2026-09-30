import json
import os

bundle_path = r"C:\Users\Priyanka\.gemini\antigravity-ide\brain\55e5014b-437f-4d48-9b64-5e12166d4c17\.system_generated\steps\808\content.md"
content = open(bundle_path, "r", encoding="utf-8").read()
json_start = content.find("{")
data = json.loads(content[json_start:])

print(f"Total files: {len(data['files'])}")
for f in data['files']:
    print(f"Path: {f['path']} ({f['bytes']} bytes, role: {f.get('role')})")
