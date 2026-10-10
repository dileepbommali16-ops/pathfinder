import json
import os
from pathlib import Path

root = Path(__file__).resolve().parent.parent
with open(root / "data" / "projects.json", "r", encoding="utf-8") as f:
    projects = json.load(f)

ts_lines = [
    "export interface ProjectBlueprint {",
    "  id: string;",
    "  roleId?: string;",
    "  title: string;",
    "  domain: string;",
    "  roleMatch?: string;",
    "  difficulty: 'Intermediate' | 'Advanced' | string;",
    "  techStack: string[];",
    "  overview: string;",
    "  features: string[];",
    "  architectureSummary?: string;",
    "  resumeBullet: string;",
    "  psCode?: string;",
    "  category?: 'software' | 'hardware' | string;",
    "  branch?: string;",
    "  organization?: string;",
    "}",
    "",
    f"export const DEFAULT_PROJECT_CATALOG: ProjectBlueprint[] = {json.dumps(projects, indent=2)};",
    ""
]

out_dir = root / "client" / "src" / "data"
out_dir.mkdir(parents=True, exist_ok=True)
out_file = out_dir / "projectCatalog.ts"

with open(out_file, "w", encoding="utf-8") as f:
    f.write("\n".join(ts_lines))

print(f"Generated {out_file} with {len(projects)} projects.")
