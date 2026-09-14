import csv
import json
from pathlib import Path
from urllib.request import urlopen

SOURCE = "https://raw.githubusercontent.com/ShuklaPrashant21/Campus_Recruitment/master/Placement_Data_Full_Class.csv"
OUT = Path("server/data/placement-data.json")
OUT.parent.mkdir(parents=True, exist_ok=True)

with urlopen(SOURCE) as response:
    text = response.read().decode("utf-8")

rows = []
for row in csv.DictReader(text.splitlines()):
    degree = (row.get("degree_t") or "Unknown").strip()
    specialization = (row.get("specialisation") or "General").strip()
    workex = (row.get("workex") or "No").strip()
    rows.append({
        "sourceId": int(row["sl_no"]),
        "year": 2015,
        "branch": degree,
        "gender": "Female" if row.get("gender") == "F" else "Male",
        "skillCategory": f"{specialization} · {'Experienced' if workex == 'Yes' else 'Fresher'}",
        "placed": row.get("status") == "Placed",
        "cgpa": round((float(row.get("degree_p") or 0) / 10), 2),
        "codingScore": round(float(row.get("etest_p") or 0) / 10, 1),
        "communicationScore": round(float(row.get("mba_p") or 0) / 10, 1),
        "internships": 1 if workex == "Yes" else 0,
    })

OUT.write_text(json.dumps(rows, indent=2) + "\n")
print(f"wrote {len(rows)} placement records to {OUT}")
