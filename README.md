# Pathfinder (Android)

Native Android application for student placement readiness evaluation and cohort analytics, built with Kotlin, Jetpack Compose, and Room Database.

## Features

- **Placement Readiness Calculator**: Interactive parameter sliders (CGPA, Backlogs, Internships, Communication, Coding Confidence) powering dynamic chance assessment, animated score gauge, and personalized actionable recommendations.
- **Cohort Analytics & Benchmarking**: Filterable analysis over 650 student placement records (2024–2026) across Engineering branches (CSE, IT, ECE, MECH, CIVIL) and Skill Tiers, featuring placement distribution donut charts and branch-level rankings.
- **Assessment History**: Local SQLite persistence via Room Database with reactive Kotlin Flows to track readiness improvements over time.
- **AI Placement Coach**: Structured roadmaps covering Data Structures & Algorithms, Core CS (OS, DBMS, CN), behavioral STAR method techniques, and an interactive ATS resume checklist.
- **Data Export**: Built-in CSV cohort data export and sharing via Android Sharesheet.

## Streamlit AI Agent

The `app.py` Streamlit application includes a friendly general-purpose **Pathfinder AI Agent**. It supports multi-turn chat, English, Telugu, bilingual English + Telugu replies, automatic language detection, profile-aware placement guidance, prompt starters, and a clear-chat control. The agent uses the model named by `GEMINI_MODEL` first, then OpenRouter's free-model router, and finally deterministic offline placement guidance if external providers are unavailable.

### Streamlit Cloud setup

Add the following values under **Streamlit Cloud → Settings → Secrets**:

```toml
GEMINI_API_KEY = "your-gemini-api-key"
GEMINI_MODEL = "gemini-3.7-flash"
# Optional free fallback provider. Create a key at https://openrouter.ai/settings/keys
OPENROUTER_API_KEY = "your-openrouter-api-key"
OPENROUTER_MODEL = "openrouter/free"
```

If Gemini quota is exhausted, the app automatically tries OpenRouter's free router. If both keys are absent or unavailable, the built-in offline coach still returns placement guidance instead of an error. OpenRouter requires its own free API key; it cannot be inferred from the Gemini key.

### Optional secure login secrets

The login screen supports `[auth].users` in Streamlit Secrets. Values use the format `sha256$salt$hash`, where `hash` is the SHA-256 hexadecimal digest of `salt:password`. Do not commit passwords or API keys. When no `[auth].users` mapping exists, the app remains in demo mode and accepts any non-empty sign-in details; guest mode is limited to three AI messages per session.

```toml
[auth.users]
student@example.com = "sha256$change-this-salt$paste-the-sha256-of-salt-colon-password"
```

For a real deployment, generate the digest locally, paste only the resulting `sha256$salt$hash` value into Streamlit Cloud Secrets, and rotate it if the account is shared.

## Architecture

- **UI Framework**: Modern Jetpack Compose with Material Design 3 (M3).
- **Architecture Pattern**: MVVM (Model-View-ViewModel) with Clean Architecture principles.
- **Local Persistence**: Room Database 2.6.1 with KSP code generation.
- **Reactive State**: Kotlin Coroutines & `StateFlow` with lifecycle-aware collection.
- **Vector Assets & Adaptive Launcher Icon**: Custom adaptive icons with dedicated safe-zone layers.
