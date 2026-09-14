# LegalLens — Responsive Architecture & Layout System (`RESPONSIVE.md`)

**Product**: LegalLens (Accessible AI Legal Intelligence)  
**Standard**: Mobile-First, Additive CSS Architecture (`min-width` scaling only)  
**Status**: 🔒 **LOCKED BY USER DIRECTIVE** (Do not alter layout ratios or breakpoint tokens without explicit instruction)  
**Enforcement**: Strict Breakpoint Isolation Contract & 7-Point Audit Matrix

---

## 1. Breakpoint Token Definitions

LegalLens defines 5 explicit responsive breakpoint tokens. All components MUST consume these standardized tokens rather than ad-hoc pixel values:

| Breakpoint Token | Viewport Width Range | Target Devices & Viewports | Tailwind Utility Equivalent |
| :--- | :--- | :--- | :--- |
| **`mobile`** | `0px – 480px` | Small to standard smartphones (iPhone SE 375px, iPhone 16 393px, Android 412px) | Base styles (No prefix) |
| **`mobile-lg`** | `481px – 767px` | Large smartphones, phablets in portrait mode | `sm:` (`min-width: 481px` / `640px`) |
| **`tablet`** | `768px – 1023px` | Tablets in portrait mode (iPad 768px), foldable displays | `md:` (`min-width: 768px`) |
| **`laptop`** | `1024px – 1439px` | Tablets in landscape (1024px), small laptops, compact monitors | `lg:` (`min-width: 1024px`) |
| **`desktop`** | `1440px and up` | Standard desktop monitors (1440px), ultrawide displays (1920px+) | `xl:` / `2xl:` (`min-width: 1440px`) |

---

## 2. Screen-by-Screen Layout Reference Matrix

Before and after any UI modification, Antigravity verifies layout behavior against this reference table:

| Component / Screen | `mobile` (≤480px) | `mobile-lg` (481–767px) | `tablet` (768–1023px) | `laptop` / `desktop` (≥1024px) |
| :--- | :--- | :--- | :--- | :--- |
| **Navbar** | Condensed tab labels (`Find Help` on ≥380px, `Help` on <380px), compact trust badge icon | Full tab labels (`Analyze`, `Compare`, `Find Help`), compact trust text badge | Full tab labels, complete trust badge + settings button intact | Full brand logo, full tab labels, complete trust badge & settings cluster |
| **Analyze Hero Header** | Stacked text-then-illustration layout; illustration hidden on <380px, max-height 140px on ≥380px | Stacked text-then-illustration, max-height 160px | Side-by-side text + illustration layout (`md:grid-cols-2`), max-height 180px | Full side-by-side banner layout (`lg:grid-cols-2`), max-height 220px |
| **Document Capture** | **Device-Aware Primary**: Camera-first default on touch/mobile devices; single-column upload card | Dual camera / upload mode switcher; single-column layout | **Device-Aware Primary**: File upload default on desktop/laptop; QR phone handoff banner visible | File upload default + desktop QR phone handoff banner + Drag-and-Drop dropzone |
| **Compare View** | Stacked single-column document inputs (`Document A` above `Document B`), 100% full width | Stacked single-column inputs, 100% width | Side-by-side 2-column document input grid (`md:grid-cols-2`), aligned height textareas | Side-by-side 2-column panels (`lg:grid-cols-2`), full clause diff & risk delta table |
| **Find Help (Legal Aid)** | Stacked priority order: Title → Description → Search → 1-Column District Cards list | Single-column filter controls & stacked district cards | Split 2-column header layout (`md:grid-cols-2`), 2-column district cards grid | Split header layout + 2-column district cards grid + sticky filter side-panel |
| **Footer** | Single-column stacked footer sections, centered "Connect with me" social row (48x48px tap targets) | Stacked sections, centered social row, centered copyright bar | 3-column navigation grid (`md:grid-cols-3`), full-width social row | 3-column grid, animated background linework pattern, full-width social row |

---

## 3. Core Architectural Rules

### Rule A: Mobile-First, Additive CSS Only
- **Base styles (unprefixed)** represent the smallest mobile layout (`0px – 480px`).
- Larger screens MUST ONLY ADD or ENHANCE styles via `min-width` media queries (e.g. `sm:`, `md:`, `lg:`, `xl:`).
- **STRICTLY PROHIBITED**: Never write desktop-first CSS using `max-width` overriding-down blocks. Overriding downward causes cascading regressions on smaller breakpoints.

### Rule B: Breakpoint Scoping Contract
- Every UI modification request MUST specify its intended breakpoint scope (e.g., `mobile-only`, `tablet-and-up`).
- Implementation MUST wrap changes inside target breakpoint classes/selectors (e.g. `hidden min-[380px]:block`, `md:flex-row`).
- Changes MUST NEVER alter shared base styles that un-scoped breakpoints depend on.

### Rule C: Device Capability vs Viewport Width
- Input method features (such as Camera vs File Upload defaults) MUST key off actual device capability (`'ontouchstart' in window` or `navigator.maxTouchPoints > 0` and camera availability), NOT purely viewport width, ensuring touch laptops or stylus screens are never miscategorized.

---

## 4. Regression Audit Checklist (7-Viewport Matrix)

After every UI edit, verify layout integrity across the full 7-viewport suite:

- [ ] **375px** (iPhone SE): No horizontal overflow, buttons fit comfortably, labels legible, no text overlap.
- [ ] **393px** (iPhone 16): Clean spacing, proper tap target padding (≥40x40px).
- [ ] **412px** (Common Android): Proper flex wrapping, clear visual hierarchy.
- [ ] **768px** (Tablet Portrait): Side-by-side layouts activate cleanly (`md:grid-cols-2`).
- [ ] **1024px** (Tablet Landscape / Small Laptop): Desktop navigation & QR handoff card visible (`lg:` grid).
- [ ] **1440px** (Laptop / Desktop): Centered container max-width (`max-w-7xl`), clean margins, no layout stretching.
- [ ] **1920px** (Large Desktop): Pristine typography scaling, centered canvas background.

---

## 5. Automated Impeccable Responsive Critique

Run `impeccable critique` to evaluate responsive layout integrity, visual hierarchy, touch target ergonomics, and cross-device consistency whenever editing shared layout components (`Navbar`, `Footer`, `DocumentCapture`, `ComparisonView`, `LegalAidLocator`).
