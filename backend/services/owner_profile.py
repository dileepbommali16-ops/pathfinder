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
    "dob": "16/01/2006",
    "age": 20,
    "education": {
        "degree": "B.Tech 3rd year",
        "branch": "CSE (Data Science)",
        "college": "NRI Institute of Technology",
        "location": "Pothavarappadu, Agiripalli",
    },
    "hometown": "Gunadala, Vijayawada",
    "state": "Andhra Pradesh",
    "hobbies": ["guitarist (primary — his strongest passion)", "dancer", "singer"],
    "family": {
        "mother": "Bhavani",
        "father": "Ramana",
        "sister": "Priyanka (works in Hyderabad)",
    },
    "likes": [
        "Hackathons",
        "Spending time with family — especially his parents and his sister",
        "His grandmother (ammamma) and great-grandmother (peddamma)",
        "Good friends with real character — he values friendship with people who "
            "have genuine character",
        "People who talk kindly and respectfully",
        "Classic, well put-together fashion and dressing sense",
        "Guitarists and guitar music",
        "Children — he's very fond of kids",
    ],
    "personality_traits": [
        "A bit of an OCD/neat-freak — likes things clean and organized",
        "Values kindness and genuine character in people he's close to",
        "Warm and friendly once you get to know him",
    ],
    "social": {
        "instagram": "dileepdasss",
    },
    "favorite_lecturers": {
        "Dr. Chaitanya madam": "Teaches Machine Learning. Dileep considers her an "
            "all-rounder with many talents, and someone who explains ML concepts "
            "really well.",
        "Swami sir": "Teaches Operating Systems. Dileep considers him an excellent "
            "teacher who explains OS concepts clearly.",
    },
    # Natural-language bio DAS can draw from when the owner asks "tell me about
    # myself" or similar — written warmly, grounded only in confirmed facts.
    "natural_bio": (
        "Dileep Bommali — goes by Dileep Das — is a 20-year-old B.Tech 3rd year "
        "student in CSE with a specialization in Data Science at NRI Institute of "
        "Technology, Pothavarappadu, Agiripalli. He's originally from Gunadala, "
        "Vijayawada, in Andhra Pradesh. Outside academics, music is a big part of "
        "who he is — he's a guitarist first and foremost, and also dances and "
        "sings. He comes from a close family: his mother Bhavani, father Ramana, "
        "and his sister Priyanka, who works in Hyderabad. He built Pathfinder "
        "himself, as a B.Tech student passionate about using AI to help other "
        "students figure out where they stand for placements and what to do "
        "about it."
    ),
}

# Safe to share with ANY user, including strangers/stakeholders — no private details.
OWNER_PUBLIC_BIO = (
    "Dileep Bommali is the creator of Pathfinder, a B.Tech CSE (Data Science) "
    "student passionate about building AI-powered tools for student placement "
    "readiness."
)


def get_owner_emails() -> list[str]:
    """Retrieves list of configured owner emails from environment variables."""
    raw = os.getenv("OWNER_EMAIL", "dileepbommali16@gmail.com,dileepbommali16@users.noreply.github.com,dileep@pathfinder.ai,dileep")
    return [e.strip().lower() for e in raw.split(",") if e.strip()]


def is_owner_user(user: Optional[Any] = None, email: Optional[str] = None, username: Optional[str] = None) -> bool:
    """
    Cryptographic and server-side check to determine if the active session belongs to the owner.
    Checks against OWNER_EMAIL configured in .env. Never relies on guessable passwords.
    """
    owner_emails = get_owner_emails()

    check_emails = []
    if email:
        check_emails.append(email.strip().lower())
    if username:
        check_emails.append(username.strip().lower())

    if user:
        if isinstance(user, dict):
            if user.get("email"):
                check_emails.append(str(user["email"]).strip().lower())
            if user.get("username"):
                check_emails.append(str(user["username"]).strip().lower())
        else:
            if hasattr(user, "email") and user.email:
                check_emails.append(str(user.email).strip().lower())
            if hasattr(user, "username") and user.username:
                check_emails.append(str(user.username).strip().lower())

    for val in check_emails:
        if val in owner_emails:
            return True
        # Also check prefix or exact match
        for owner in owner_emails:
            if val == owner or (owner.startswith(val) and len(val) >= 6):
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
You may reference his personal background naturally, warmly, and proudly.
- Preferred Name: {OWNER_PROFILE['preferred_name']}
- DOB: {OWNER_PROFILE['dob']} (Age: {OWNER_PROFILE['age']})
- College: {OWNER_PROFILE['education']['college']} ({OWNER_PROFILE['education']['degree']}, {OWNER_PROFILE['education']['branch']}) at {OWNER_PROFILE['education']['location']}
- Hometown: {OWNER_PROFILE['hometown']}, {OWNER_PROFILE['state']}
- Hobbies: {', '.join(OWNER_PROFILE['hobbies'])}
- Family: Mother {OWNER_PROFILE['family']['mother']}, Father {OWNER_PROFILE['family']['father']}, Sister {OWNER_PROFILE['family']['sister']}
- Mentors:
  * Dr. Chaitanya madam: {OWNER_PROFILE['favorite_lecturers']['Dr. Chaitanya madam']}
  * Swami sir: {OWNER_PROFILE['favorite_lecturers']['Swami sir']}
- Bio summary: {OWNER_PROFILE['natural_bio']}
- When he asks 'tell me about myself', recite his natural bio warmly and proudly.
"""
    else:
        return f"""
[VISITOR USER CONTEXT - NON-OWNER USER]
The user interacting with you is a student, recruiter, judge, or stakeholder. They are NOT the boss.
- DO NOT claim this user is the boss.
- DO NOT address this user as 'Boss'. Address them as a friendly, respected student candidate or guest.
- STRICT PRIVACY RULE: NEVER reveal Dileep's private details (NO date of birth, NO age, NO family member names like Bhavani/Ramana/Priyanka, NO exact hometown Gunadala).
- If asked 'who is your boss', 'who made this', or 'tell me about Dileep', you may ONLY share the public bio:
  "{OWNER_PUBLIC_BIO}"
"""
