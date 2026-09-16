import csv
import random
from pathlib import Path

random.seed(20260916)
output = Path('/home/ubuntu/student-placement-website/sample-placement-2024-2026.csv')
years = [2024, 2025, 2026]
courses = ['CSE', 'CSD', 'EEE', 'AIML', 'IT', 'CSM']
genders = ['Male', 'Female']
skills = ['C', 'Python', 'Java', 'SQL', 'Machine Learning', 'Data Visualization']
course_bonus = {'CSE': 7, 'CSD': 6, 'EEE': 2, 'AIML': 8, 'IT': 5, 'CSM': 7}
skill_bonus = {'C': 3, 'Python': 5, 'Java': 4, 'SQL': 3, 'Machine Learning': 8, 'Data Visualization': 5}

rows = []
source_id = 2024001
for year in years:
    year_bonus = {2024: 0, 2025: 3, 2026: 6}[year]
    for course in courses:
        for gender in genders:
            for skill in skills:
                for _ in range(3):
                    cgpa = round(random.uniform(6.0, 9.6), 1)
                    coding = max(45, min(98, round(48 + cgpa * 4 + course_bonus[course] + skill_bonus[skill] + random.randint(-15, 12))))
                    communication = max(45, min(98, round(random.uniform(52, 92))))
                    internships = random.choices([0, 1, 2, 3], weights=[25, 40, 25, 10])[0]
                    placement_score = (cgpa - 6) * 9 + (coding - 50) * 0.35 + (communication - 50) * 0.18 + internships * 6 + course_bonus[course] + skill_bonus[skill] + year_bonus
                    placed = 1 if placement_score >= 55 else 0
                    rows.append({
                        'sourceId': source_id,
                        'year': year,
                        'branch': course,
                        'gender': gender,
                        'skillCategory': skill,
                        'placed': placed,
                        'cgpa': cgpa,
                        'codingScore': coding / 10,
                        'communicationScore': communication / 10,
                        'internships': internships,
                    })
                    source_id += 1

with output.open('w', newline='', encoding='utf-8') as file:
    writer = csv.DictWriter(file, fieldnames=['sourceId', 'year', 'branch', 'gender', 'skillCategory', 'placed', 'cgpa', 'codingScore', 'communicationScore', 'internships'])
    writer.writeheader()
    writer.writerows(rows)

print(f'created {output} with {len(rows)} records')
print('placed:', sum(row['placed'] for row in rows), 'not placed:', len(rows) - sum(row['placed'] for row in rows))
