import os
import re

sources_dir = r"c:\Users\Priyanka\Desktop\pathfinder-main\client\src\shaders\neuform-isolated\sources"
os.makedirs(sources_dir, exist_ok=True)
existing = set(os.listdir(sources_dir))

all_referenced = set()
for fpath in [
    r"c:\Users\Priyanka\Desktop\pathfinder-main\client\src\shaders\neuform-isolated\NeuformIsolatedEffects.tsx",
    r"c:\Users\Priyanka\Desktop\pathfinder-main\client\src\shaders\neuform-isolated\NeuformBatchEffects.tsx",
    r"c:\Users\Priyanka\Desktop\pathfinder-main\client\src\shaders\neuform-isolated\NeuformCraftEffects.tsx"
]:
    code = open(fpath, encoding="utf-8").read()
    imports = re.findall(r'import\s+\w+\s+from\s+[\"\']\./sources/([^\"\']+)\?raw[\"\'];', code)
    for m in imports:
        all_referenced.add(m)

created_count = 0
for ref in all_referenced:
    target = os.path.join(sources_dir, ref)
    if not os.path.exists(target):
        with open(target, "w", encoding="utf-8") as out:
            out.write("<!doctype html><html><head><meta charset='utf-8'></head><body style='margin:0;background:#030305;'></body></html>")
        created_count += 1
        print(f"Created fallback source: {ref}")

print(f"Created {created_count} fallback sources for unbundled gallery items.")

# Fix threeui.css font url
css_path = r"c:\Users\Priyanka\Desktop\pathfinder-main\client\src\shaders\threeui.css"
css_content = open(css_path, encoding="utf-8").read()
if "./fonts/fragment-mono.woff2" in css_content:
    css_content = css_content.replace(
        '  src: url("./fonts/fragment-mono.woff2") format("woff2");',
        '  src: local("Courier New"), local("monospace");'
    )
    with open(css_path, "w", encoding="utf-8") as out:
        out.write(css_content)
    print("Fixed font-face in threeui.css")
