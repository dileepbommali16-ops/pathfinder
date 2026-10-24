---
name: Pathfinder 2.0
description: Autonomous AI Career Intelligence & Placement Predictor
colors:
  primary: "#9f1239"
  secondary: "#7c3aed"
  bg-base: "#0a0b10"
  bg-card: "#11131c"
  bg-card-subtle: "#161926"
  text-primary: "#f8fafc"
  text-secondary: "#94a3b8"
  text-muted: "#64748b"
  avatar-canvas: "#000000"
  avatar-cobalt: "#2c3480"
  avatar-crimson: "#dc2626"
typography:
  display:
    fontFamily: "Inter, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.1
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1.25rem"
  xl: "1.5rem"
spacing:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "0.75rem 1.5rem"
  card-panel:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "1.75rem"
---

# Design System: Pathfinder 2.0

## Overview

**Creative North Star: "Cybernetic Obsidian Observatory"**

Pathfinder 2.0 embodies an ultra-luxury, dark-mode cybersecurity and career intelligence aesthetic. Deep Obsidian Nocturne (`#0a0b10`) and OLED True Black (`#000000`) establish an unyielding low-noise baseline. Strategic accents of Deep Wine Velvet (`#9f1239`), Royal Violet Amethyst (`#7c3aed`), and glowing Crimson (`#dc2626`) punctuate high-salience placement telemetry and real-time AI states.

**Key Characteristics:**
- **OLED Grounding**: Zero-light backdrop providing infinite contrast for floating telemetry.
- **Glassmorphic Obsidian**: Translucent frosted panels (`#11131c` with subtle borders) layering data without visual clutter.
- **Biometric 3D Avatar**: Real-time neural mesh and photo-grade cybernetic avatar anchored in pure black.
- **Deterministic Hierarchy**: Strict 3-tier color signaling reflecting candidate readiness, roadmap velocity, and system intelligence.

## Colors

The palette is strictly grounded in dark obsidian tones with precision-curated luxury jewel accents.

### Primary
- **Deep Wine Velvet** (`#9f1239`): Primary action triggers, candidate readiness indicators, and high-priority prediction telemetry.

### Secondary
- **Royal Violet Amethyst** (`#7c3aed`): AI Assistant (DAS) voice state indicators, roadmap nodes, and project blueprint milestones.

### Neutral
- **Deep Obsidian Nocturne** (`#0a0b10`): Global page canvas background.
- **OLED True Black** (`#000000`): 3D Avatar viewport, biometric dock, and login canvas.
- **Frosted Obsidian Glass** (`#11131c`): Metric cards, dashboard modules, and telemetry containers.
- **Subtle Obsidian Module** (`#161926`): Secondary cards, table headers, and nested panels.
- **Crisp Platinum White** (`#f8fafc`): Primary headlines, core metrics, and active states.
- **Refined Silver Grey** (`#94a3b8`): Descriptive body text and secondary labels.
- **Slate Metadata** (`#64748b`): Tertiary labels, timestamps, and muted stats.

### Named Rules
**The Protected Canvas Rule.** The global background (`#0a0b10`), the OLED avatar viewport (`#000000`), the LampLogin presentation, and the 3D WebGL motion system are protected platform anchors and must never be altered or replaced with light themes.

## Typography

**Display Font:** Inter, sans-serif
**Body Font:** Inter, sans-serif
**Mono Font:** JetBrains Mono, monospace

**Character:** High-density, clean, technical legibility built for data scannability, viva grilling, and real-time streaming speech transcripts.

### Hierarchy
- **Display** (Bold 700, `clamp(2rem, 5vw, 3.5rem)`, line-height 1.1): Hero banners and dashboard score announcements.
- **Headline** (Semi-bold 600, `1.5rem` to `2rem`, line-height 1.25): Tab headings and section titles.
- **Title** (Medium 500, `1.125rem` to `1.25rem`, line-height 1.35): Card headers and blueprint titles.
- **Body** (Regular 400, `0.9375rem` to `1rem`, line-height 1.5): Architectural descriptions, placement guides, and viva prompts.
- **Label** (Medium 500, `0.75rem` to `0.875rem`, letter-spacing 0.05em, uppercase): Status badges, metric labels, and chip tags.

## Layout

A modular responsive grid optimized for high-density telemetry.
- **Canvas Base**: Full-height viewport with sticky dock navigation.
- **Grid Density**: 12-column flexible layout collapsing to single-column cards on mobile viewports.
- **Card Spacing**: 1.5rem (`24px`) grid gaps with 1.75rem (`28px`) internal container padding.

## Elevation & Depth

Pathfinder conveys depth through tonal obsidian layering and translucent borders rather than diffuse drop shadows.

### Shadow Vocabulary
- **Subtle Obsidian Border** (`border: 1px solid rgba(255, 255, 255, 0.08)`): Primary separation mechanism for cards and panels.
- **Wine Glow** (`box-shadow: 0 0 25px rgba(159, 18, 57, 0.25)`): Active readiness state elevation.
- **Violet Glow** (`box-shadow: 0 0 25px rgba(124, 58, 237, 0.25)`): Active voice coach state elevation.

### Named Rules
**The Tonal Layering Rule.** Surfaces are separated by border contrast and background tone shifts (`#0a0b10` -> `#11131c` -> `#161926`), never by blurry colored shadows that create muddy halos.

## Shapes

- **Card Containers**: 1.25rem (`20px`) rounded radius with subtle hairline border.
- **Interactive Buttons**: 0.5rem (`8px`) rounded radius for precise, tactile feel.
- **Avatar Viewport**: 1rem (`16px`) rounded container seamlessly embedded into OLED black.

## Components

### Buttons
- **Shape**: Rounded (8px).
- **Primary**: Deep Wine Velvet background (`#9f1239`), Platinum White text (`#f8fafc`), with smooth hover transition to darker wine (`#881337`).
- **Secondary / Ghost**: Frosted glass (`rgba(255, 255, 255, 0.05)`) with 1px border (`rgba(255, 255, 255, 0.1)`).

### Cards / Containers
- **Corner Style**: Rounded (20px).
- **Background**: Frosted Obsidian Glass (`#11131c`).
- **Border**: Hairline `rgba(255, 255, 255, 0.08)`.
- **Internal Padding**: 1.75rem (`28px`).

### Navigation & Biometric Dock
- **Style**: Floating dock anchored at the bottom/side with backdrop-blur (`12px`) and active indicator badges.

## Do's and Don'ts

### Do:
- **Do** preserve the OLED True Black (`#000000`) container around the AI Avatar Canvas.
- **Do** preserve the LampLogin page styling, shaders, and animations.
- **Do** preserve the 3D WebGL background motion and shader loops.
- **Do** keep text contrast at or above WCAG AA (4.5:1) against dark cards.
- **Do** use Wine (`#9f1239`) and Violet (`#7c3aed`) sparingly for deliberate emphasis.

### Don't:
- **Don't** modify the AI voice agent face or avatar dimensions.
- **Don't** alter the main dashboard dark background (`#0a0b10`).
- **Don't** introduce bright white card backgrounds or light mode themes.
- **Don't** use text smaller than 11px on interactive labels or metadata.
