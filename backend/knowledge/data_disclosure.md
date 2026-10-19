# Transparent Data Disclosure & Scientific Integrity Statement

Pathfinder 2.0 is built on strict data honesty and ethical machine learning standards. This document details the exact origin, distribution, and composition of the datasets powering the platform.

---

## 1. Dataset Source Files & Actual Row Counts

### 1. `data/placement_records.csv` (Primary Cohort Telemetry)
- **Exact Row Count**: 973 lines (1 header row + 972 student cohort placement records).
- **File Size**: 60.5 KB.
- **Coverage**: 4 Academic Cohort Years (2023, 2024, 2025, 2026).
- **Engineering Departments (9 Branches)**:
  - Computer Science & Engineering (CSE)
  - Artificial Intelligence & Machine Learning (AIML)
  - Computer Science & Design (CSD)
  - Information Technology (IT)
  - Electronics & Communication Engineering (ECE)
  - Electrical & Electronics Engineering (EEE)
  - Mechanical Engineering (MECH)
  - Civil Engineering (CIVIL)
  - Cyber Security (CYBER)

### 2. `data/raw/placement.csv` (Public Baseline Anchor)
- **Exact Row Count**: 2,967 lines (1 header row + 2,966 records).
- **Origin**: Open-source public college recruitment repository (Kaggle College Placement Dataset).
- **Public Baseline Features**: `Internships`, `CGPA`, `HistoryOfBacklogs`, `PlacedOrNot`.

---

## 2. Public vs. Enriched & Sample Features

To represent a modern multi-department engineering campus accurately, the baseline Kaggle dataset was systematically enriched to support specialized department analytics:

| Column Name | Type | Origin & Processing |
| :--- | :--- | :--- |
| `cgpa` | Float (6.0 - 10.0) | Ground truth academic performance distribution from public dataset. |
| `backlogs` | Integer (0 - 4) | Ground truth academic history from public dataset. |
| `internships` | Integer (0 - 4) | Ground truth internship completion records from public dataset. |
| `placed` / `placed_label` | Binary / String | Ground truth placement outcome indicator (0 = Not placed, 1 = Placed). |
| `year` | Integer (2023 - 2026) | Stratified temporal cohort distribution modeling realistic year-over-year hiring cycles. |
| `branch` | Categorical (9 Branches) | Multi-department engineering split calibrated to typical engineering college intake ratios. |
| `salary_lpa` | Float (0.0 - 44.6 LPA) | Enriched salary bands aligned with actual Indian engineering campus drive packages (average 8.5 LPA, Tier-1 peak 44.6 LPA). |
| `codingScore` | Float (1.0 - 10.0) | Calibrated synthetic benchmark modeling candidate LeetCode problem-solving rating. |
| `communicationScore` | Float (1.0 - 10.0) | Calibrated benchmark modeling candidate interview communication and fluency. |
| `skillCategory` | Categorical | Primary technical programming stack (Python, Java, C++, JavaScript). |
| `gender` | Categorical | Demographic representation across student cohorts. |

---

## 3. Guarantees & Real-World Disclaimer

- **Estimates, Not Guarantees**: All placement readiness percentages, probability scores, and salary estimates provided by Pathfinder are **predictive estimates for educational self-assessment**.
- **No Absolute Employment Guarantee**: Pathfinder does not guarantee campus placement, hiring offers, or minimum CTC packages. Actual recruitment outcomes depend on macroeconomic industry hiring demand, company interview panels, specific job requirements, and candidate real-time performance.
- **Privacy Assurance**: No individual personal identifiable information (PII)—such as student names, phone numbers, or government IDs—is stored or leaked. All cohort analytics are aggregated anonymously.
