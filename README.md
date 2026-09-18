# Pathfinder (Android)

Native Android application for student placement readiness evaluation and cohort analytics, built with Kotlin, Jetpack Compose, and Room Database.

## Features

- **Placement Readiness Calculator**: Interactive parameter sliders (CGPA, Backlogs, Internships, Communication, Coding Confidence) powering dynamic chance assessment, animated score gauge, and personalized actionable recommendations.
- **Cohort Analytics & Benchmarking**: Filterable analysis over 650 student placement records (2024–2026) across Engineering branches (CSE, IT, ECE, MECH, CIVIL) and Skill Tiers, featuring placement distribution donut charts and branch-level rankings.
- **Assessment History**: Local SQLite persistence via Room Database with reactive Kotlin Flows to track readiness improvements over time.
- **AI Placement Coach**: Structured roadmaps covering Data Structures & Algorithms, Core CS (OS, DBMS, CN), behavioral STAR method techniques, and an interactive ATS resume checklist.
- **Data Export**: Built-in CSV cohort data export and sharing via Android Sharesheet.

## Architecture

- **UI Framework**: Modern Jetpack Compose with Material Design 3 (M3).
- **Architecture Pattern**: MVVM (Model-View-ViewModel) with Clean Architecture principles.
- **Local Persistence**: Room Database 2.6.1 with KSP code generation.
- **Reactive State**: Kotlin Coroutines & `StateFlow` with lifecycle-aware collection.
- **Vector Assets & Adaptive Launcher Icon**: Custom adaptive icons with dedicated safe-zone layers.
