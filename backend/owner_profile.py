"""
Owner profile for the DAS AI voice agent.

PRIVACY RULE: This file's contents must ONLY be included in the context sent to
Gemini when the verified owner (Dileep) is the one logged in and asking — never
for any other user. The backend code that builds the AI's context must check the
logged-in user against OWNER_EMAIL (set in .env) before including this data.

For any other user, only OWNER_PUBLIC_BIO below may be shared.
"""

import os
from typing import Optional, Dict, Any

OWNER_PROFILE = {
    "full_name": "Dileep Bommali",
    "preferred_name": "Dileep Das",
    "education": {
        "degree": "B.Tech 3rd year",
        "branch": "CSE (Data Science)",
        "college": "DR RVR NRI DEEMED TO BE UNIVERSITY",
        "location": "Pothavarappadu, Agiripalli",
    },
    "favorite_lecturers": {
        "Dr. Chaitanya madam": "Teaches Machine Learning. Dileep considers her an "
            "all-rounder with many talents, and someone who explains ML concepts "
            "really well.",
        "Swami sir": "Teaches Operating Systems. Dileep considers him an excellent "
            "teacher who explains OS concepts clearly.",
    },
    # Public-safe bio grounded in academic and Pathfinder project facts only.
    "natural_bio": (
        "Dileep Bommali — goes by Dileep Das — is a B.Tech 3rd year student in CSE "
        "with a specialization in Data Science at DR RVR NRI DEEMED TO BE UNIVERSITY, "
        "located at Pothavarappadu, Agiripalli. He built Pathfinder himself as a student "
        "passionate about using AI to help students evaluate their placement readiness "
        "and act on clear, structured roadmaps."
    ),
}

# Safe to share with ANY user, including visitors/stakeholders — no private details.
OWNER_PUBLIC_BIO = (
    "Dileep Bommali is the creator of Pathfinder, a B.Tech CSE (Data Science) "
    "student at DR RVR NRI DEEMED TO BE UNIVERSITY, located at Pothavarappadu, Agiripalli, "
    "passionate about building AI-powered tools for student placement "
    "readiness."
)


PRIMARY_OWNER_EMAIL = "dileepbommali16@gmail.com"


def get_owner_emails() -> list[str]:
    """Strictly returns ONLY Dileep's verified primary Gmail owner account."""
    return [PRIMARY_OWNER_EMAIL]


def is_owner_user(user: Optional[Any] = None, email: Optional[str] = None, username: Optional[str] = None) -> bool:
    """
    Strict server-side check: ONLY verified email dileepbommali16@gmail.com (or explicit OWNER_EMAIL) is Boss.
    Never matches username substrings or email prefixes so friends/guests/girls cannot spoof Boss mode.
    """
    owner_emails = set(get_owner_emails())

    check_emails = []
    if email:
        for part in str(email).split(","):
            clean_p = part.strip().lower()
            if clean_p:
                check_emails.append(clean_p)

    if user:
        if isinstance(user, dict):
            if user.get("email"):
                check_emails.append(str(user["email"]).strip().lower())
        else:
            if hasattr(user, "email") and user.email:
                check_emails.append(str(user.email).strip().lower())

    for val in check_emails:
        if val in owner_emails:
            return True

    return False


def get_context_for_user(is_owner: bool) -> str:
    """
    Enforces privacy-gating strictly at code level:
    - If is_owner is True: returns full OWNER_PROFILE context.
    - If is_owner is False: returns strictly OWNER_PUBLIC_BIO context with explicit negative constraints.
    """
    if is_owner:
        return f"""
[AUTHENTICATED OWNER IDENTITY - BOSS DILEEP BOMMALI]
You are interacting directly with the site creator and your Boss: Dileep Bommali (Dileep Das).
- Preferred Name: {OWNER_PROFILE['preferred_name']}
- College: {OWNER_PROFILE['education']['college']} ({OWNER_PROFILE['education']['degree']}, {OWNER_PROFILE['education']['branch']}) at {OWNER_PROFILE['education']['location']}
- Mentors:
  * Dr. Chaitanya madam: {OWNER_PROFILE['favorite_lecturers']['Dr. Chaitanya madam']}
  * Swami sir: {OWNER_PROFILE['favorite_lecturers']['Swami sir']}
- Bio summary: {OWNER_PROFILE['natural_bio']}
- STRICT PRIVACY RULE: Never reveal private personal details (no date of birth, no age, no family names, no hometown).
"""
    else:
        return f"""
[VISITOR USER CONTEXT - NON-OWNER USER]
The user interacting with you is a student, recruiter, judge, or stakeholder. They are NOT the boss.
- DO NOT claim this user is the boss.
- DO NOT address this user as 'Boss'. Address them as a friendly, respected student candidate or guest.
- STRICT PRIVACY RULE: NEVER reveal private personal details (NO date of birth, NO age, NO family member names, NO hometown).
- If asked 'who is your boss', 'who made this', or 'tell me about Dileep', you may ONLY share the public bio:
  "{OWNER_PUBLIC_BIO}"
"""
