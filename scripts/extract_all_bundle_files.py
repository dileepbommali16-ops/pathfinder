import json
import os
import shutil

bundle_path = r"C:\Users\Priyanka\.gemini\antigravity-ide\brain\55e5014b-437f-4d48-9b64-5e12166d4c17\.system_generated\steps\808\content.md"
content = open(bundle_path, "r", encoding="utf-8").read()
json_start = content.find("{")
data = json.loads(content[json_start:])

client_src_dir = r"c:\Users\Priyanka\Desktop\pathfinder-main\client\src"

# Clean up accidental client/shaders if present
accidental_dir = r"c:\Users\Priyanka\Desktop\pathfinder-main\client\shaders"
if os.path.exists(accidental_dir):
    shutil.rmtree(accidental_dir)

for f in data['files']:
    rel_path = f['path'] # e.g. "src/shaders/predictive-arc/..."
    # Map "src/" to "client/src/"
    sub_path = rel_path.replace("src/", "", 1)
    full_path = os.path.join(client_src_dir, sub_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as out:
        out.write(f['code'])
    print(f"Extracted: {full_path}")

print("All files placed in client/src/shaders successfully.")
