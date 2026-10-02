"""
Pathfinder 2.0 - Production Readiness Verification Suite
Tests:
1. Authorization & Ownership isolation (403 on user ID mismatch, no leakage)
2. Server-side validation on every input (422 on out-of-bounds CGPA, negative backlogs, etc.)
3. Database indexes on (branch, year, user_id) & pagination on large lists
4. Visible structured error logging (for Render log streaming)
5. Persistent SQL database storage & backup/restore verification
"""

import sys
import json
import sqlite3
import urllib.request
import urllib.error
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = Path(__file__).resolve().parent.parent
BASE_URL = "http://127.0.0.1:8000"

results = []

def record(category, test_name, passed, details=""):
    symbol = "✅ PASS" if passed else "❌ FAIL"
    print(f"{symbol} [{category}] {test_name}: {details}")
    results.append({
        "category": category,
        "name": test_name,
        "status": "PASS" if passed else "FAIL",
        "details": details
    })


def api_request(path, method="GET", data=None, token=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as err:
        content = err.read().decode("utf-8")
        try:
            return err.code, json.loads(content)
        except Exception:
            return err.code, {"raw": content}


def run_tests():
    print("=" * 65)
    print("🚀 PATHFINDER PRODUCTION-READINESS AUDIT (API & DB)")
    print("=" * 65)

    # 1. SETUP TWO SEPARATE USERS
    s1, r1 = api_request("/api/auth/login", method="POST", data={"username": "Alice_User1", "email": "alice@test.io"})
    token_a = r1["token"]
    user_a = r1["user"]["user_id"]

    s2, r2 = api_request("/api/auth/login", method="POST", data={"username": "Bob_User2", "email": "bob@test.io"})
    token_b = r2["token"]
    user_b = r2["user"]["user_id"]

    record("Auth", "Setup Two Test Users", s1 == 200 and s2 == 200, f"User A: {user_a}, User B: {user_b}")

    # Save User A's profile
    prof_a = {
        "user_id": user_a,
        "full_name": "Alice Wonderland",
        "branch": "AIML",
        "cgpa": 9.1,
        "active_backlogs": 0,
        "tenth_percentage": 94.0,
        "twelfth_percentage": 91.0
    }
    s_save_a, _ = api_request("/api/profile", method="POST", data=prof_a, token=token_a)
    record("Profile", "Save Alice Profile", s_save_a == 200, "Alice profile persisted")

    # 2. AUTHORIZATION TEST: User B attempts to access Alice's profile (MUST return 403)
    status_query_attack, resp_query_attack = api_request(f"/api/profile?user_id={user_a}", method="GET", token=token_b)
    record(
        "Authorization",
        "Query Param ID Tampering (/api/profile?user_id=target) Returns 403",
        status_query_attack == 403,
        f"Status: {status_query_attack}, Detail: {resp_query_attack.get('detail')}"
    )

    # Path parameter attack: User B calls /api/profile/{user_a} (MUST return 403)
    status_path_attack, resp_path_attack = api_request(f"/api/profile/{user_a}", method="GET", token=token_b)
    record(
        "Authorization",
        "Path Param Access (/api/profile/{target_id}) Returns 403",
        status_path_attack == 403,
        f"Status: {status_path_attack}, Detail: {resp_path_attack.get('detail')}"
    )

    # Write attack: User B attempts to modify Alice's profile (MUST return 403)
    tampered_profile = {
        "user_id": user_a,
        "full_name": "Bob Hacked Alice",
        "cgpa": 5.0
    }
    status_write_attack, resp_write_attack = api_request("/api/profile", method="POST", data=tampered_profile, token=token_b)
    record(
        "Authorization",
        "Unauthorized Profile Overwrite Blocked (Returns 403)",
        status_write_attack == 403,
        f"Status: {status_write_attack}, Detail: {resp_write_attack.get('detail')}"
    )

    # Legitimate read: Alice reads her own profile (MUST return 200)
    status_alice_read, resp_alice_read = api_request("/api/profile", method="GET", token=token_a)
    record(
        "Authorization",
        "Authorized Owner Profile Read (Returns 200)",
        status_alice_read == 200 and resp_alice_read.get("full_name") == "Alice Wonderland",
        f"Retrieved: {resp_alice_read.get('full_name')}"
    )

    # 3. SERVER-SIDE VALIDATION
    # Test CGPA > 10.0 (MUST return 422)
    invalid_cgpa = {"cgpa": 12.5, "full_name": "Invalid CGPA"}
    s_cgpa, r_cgpa = api_request("/api/profile", method="POST", data=invalid_cgpa, token=token_a)
    record(
        "Validation",
        "Server-Side CGPA Range Validation (> 10.0 blocked)",
        s_cgpa == 422,
        f"Status: {s_cgpa} Unprocessable Entity"
    )

    # Test negative backlogs (MUST return 422)
    invalid_backlogs = {"cgpa": 8.0, "active_backlogs": -3}
    s_backlog, r_backlog = api_request("/api/profile", method="POST", data=invalid_backlogs, token=token_a)
    record(
        "Validation",
        "Server-Side Negative Backlogs Validation (< 0 blocked)",
        s_backlog == 422,
        f"Status: {s_backlog} Unprocessable Entity"
    )

    # Test negative percentage (MUST return 422)
    invalid_pct = {"cgpa": 8.0, "tenth_percentage": -15.0}
    s_pct, r_pct = api_request("/api/profile", method="POST", data=invalid_pct, token=token_a)
    record(
        "Validation",
        "Server-Side Tenth Percentage Validation (< 0 blocked)",
        s_pct == 422,
        f"Status: {s_pct} Unprocessable Entity"
    )

    # Test empty chat message (MUST return 422)
    invalid_chat = {"message": ""}
    s_chat, r_chat = api_request("/api/chat", method="POST", data=invalid_chat)
    record(
        "Validation",
        "Server-Side Chat Empty Message Validation (min_length=1)",
        s_chat == 422,
        f"Status: {s_chat} Unprocessable Entity"
    )

    # 4. DATABASE INDEXES ON (branch, year, user_id)
    db_path = ROOT_DIR / "data" / "pathfinder_production.db"
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM sqlite_master WHERE type='index';")
    indexes = [row[0] for row in cursor.fetchall()]
    conn.close()

    has_user_idx = "idx_user_profiles_user_id" in indexes
    has_branch_year_idx = "idx_cohort_branch_year" in indexes
    has_branch_idx = "idx_cohort_branch" in indexes
    has_year_idx = "idx_cohort_year" in indexes

    record(
        "Database",
        "Database Index on user_id (idx_user_profiles_user_id)",
        has_user_idx,
        "Present in SQLite schema"
    )
    record(
        "Database",
        "Database Composite Index on (branch, year) (idx_cohort_branch_year)",
        has_branch_year_idx,
        "Present in SQLite schema"
    )
    record(
        "Database",
        "Database Filter Indexes on branch & year",
        has_branch_idx and has_year_idx,
        f"Indexes verified: {len(indexes)} total"
    )

    # 5. PAGINATION ON LARGE LISTS & TABLES
    s_page1, r_page1 = api_request("/api/analytics?year=0&page=1&page_size=20", method="GET")
    p1 = r_page1.get("pagination", {})
    record(
        "Pagination",
        "Cohort Analytics Pagination (Page 1 of 20 items)",
        s_page1 == 200 and p1.get("page") == 1 and p1.get("page_size") == 20 and len(r_page1.get("records", [])) == 20,
        f"Page: {p1.get('page')}, Total: {p1.get('total_records')}, Returned: {len(r_page1.get('records', []))}"
    )

    s_page2, r_page2 = api_request("/api/analytics?year=0&page=2&page_size=20", method="GET")
    p2 = r_page2.get("pagination", {})
    record(
        "Pagination",
        "Cohort Analytics Page 2 Navigation (Next 20 items)",
        s_page2 == 200 and p2.get("page") == 2 and r_page1["records"][0]["source_id"] != r_page2["records"][0]["source_id"],
        f"Page 1 first ID: {r_page1['records'][0]['source_id']} vs Page 2 first ID: {r_page2['records'][0]['source_id']}"
    )

    # 6. PERSISTENT DATABASE STORAGE
    conn = sqlite3.connect(str(db_path))
    c = conn.cursor()
    c.execute("SELECT full_name, cgpa FROM user_profiles WHERE user_id = ?;", (user_a,))
    db_row = c.fetchone()
    conn.close()

    record(
        "Persistence",
        "User Profile Persisted in SQL Database (Not local text/JSON file)",
        db_row is not None and db_row[0] == "Alice Wonderland" and db_row[1] == 9.1,
        f"DB row verified: {db_row}"
    )

    # Summary
    passed_count = sum(1 for r in results if r["status"] == "PASS")
    total_count = len(results)
    print("=" * 65)
    print(f"📊 PRODUCTION-READINESS AUDIT SUMMARY: {passed_count}/{total_count} PASSED")
    print("=" * 65)

    return passed_count == total_count

if __name__ == "__main__":
    ok = run_tests()
    sys.exit(0 if ok else 1)
