# LegalLens — Design System & Craft Specification (`DESIGN.md`)

**Product**: LegalLens (AI for Legal Assistance & Access)  
**Mode**: Operate (Warm-neutral clarity, restraint, unhurried typography, and accessibility outrank flash)  
**Theme**: Warm Cream & Terracotta (Modeled on Ivo.ai warm-neutral color logic)

---

## 1. Color Palette & Tokens

### Warm Cream Palette
- **Base Canvas Background**: Warm Cream / Off-White (`#F6F1E7`)
- **Card & Surface Background**: Lighter Warm Paper Tone (`#FBF8F1`)
- **High-Contrast Surface (Footer / Accents)**: Deep Warm Charcoal (`#17140F`)
- **Primary Text**: Warm Near-Black Charcoal (`#1E1B17`)
- **Secondary / Muted Text**: Warm Gray (`#6E6659`)
- **Borders & Dividers**: Thin Light Warm Gray (`#E7E1D3`)
- **Primary Action Accent (CTA)**: Muted Burnt Terracotta / Rust (`#B85C38`)

> [!IMPORTANT]
> **Accent Color Rationing**: Burnt Terracotta (`#B85C38`) is strictly reserved for the single primary call-to-action per screen. Secondary elements (tabs, badges, toggles) MUST use neutral charcoal or light warm gray outlines.

---

### Traffic-Light Risk System (Semantic - Restricted to Risk Indicators Only)
> [!NOTE]
> Red, Amber, and Emerald are strictly semantic (risk levels). They must NEVER be used decoratively on standard buttons, headers, or neutral badges.

1. **High Risk (🔴)**:
   - Icon: `AlertOctagon`
   - Surface: `#FEE2E2` | Border: `#FCA5A5` | Text: `#991B1B`
   - Format: Color + Icon + Plain language consequence sentence.

2. **Watch Out / Moderate Risk (🟡)**:
   - Icon: `Clock`
   - Surface: `#FEF3C7` | Border: `#FDE68A` | Text: `#92400E`
   - Format: Color + Icon + Plain language consequence sentence.

3. **Low Risk / Safe (🟢)**:
   - Icon: `CheckCircle2`
   - Surface: `#D1FAE5` | Border: `#6EE7B7` | Text: `#065F46`
   - Format: Color + Icon + Plain language consequence sentence.

---

## 2. Typography & Fonts

### Typeface Pairing
- **Primary Display & Headers**: `Outfit` (geometric, warm headers)
- **Body & Clause Text**: `Inter` (high-legibility body)
- **Multilingual Support**: `Noto Sans Devanagari` (proper Hindi/Marathi rendering without broken fallbacks)

### Type Scale
| Token | Font Family | Size / Line Height | Weight | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | Outfit | `24px / 1.25` | Bold (700) | Hero & Main Section Titles |
| **Title** | Outfit | `18px / 1.3` | Bold (700) | Card Headers & Modal Titles |
| **Subtitle** | Outfit | `15px / 1.4` | SemiBold (600) | Clause Titles & Sub-headers |
| **Body** | Inter | `14px / 1.6` | Medium (500) | Clause Rewrites & Summary Text |
| **Caption** | Inter | `12.5px / 1.5` | Regular (400) | Original Contract Text |
| **Micro / Badge** | Inter | `11px / 1.4` | SemiBold (600) | Categories, Metadata, Citations |

---

## 3. Spacing, Elevation & Shapes

- **Grid**: Strict 8px grid (`8px`, `16px`, `24px`, `32px`, `48px`).
- **Elevation**: Flat with thin `#E7E1D3` borders. Subtle hover-lift (`hover:-translate-y-0.5 hover:shadow-md`) on interactive cards.
- **Shape Variety**:
  - Main Hero / Analyze Header: Open layout with reserved illustration graphic slot.
  - Clause Cards: Warm paper cards (`#FBF8F1`).
  - Legal Aid Helpline Module: High-contrast warm charcoal block (`#17140F` with `#F6F1E7` text) dominating the section.

---

## 4. Motion & Micro-Interactions

- **Duration**: `150ms` - `250ms` ease-out transitions (`transition-all duration-200 ease-out`).
- **Tab Cross-fade**: Smooth opacity transition between Analyze, Compare, and Legal Aid views.
- **Card Lift**: `-translate-y-0.5` lift on card hover.

---

## 5. Accessibility Constraints (Non-Negotiable)

1. **Icon + 1-2 Words on EVERY Button**: Never icon alone, never long sentence button.
2. **Voice Everywhere**: Voice STT (`Mic`) next to text inputs; Voice TTS (`Volume2`) on all clause explanations and chat responses.
3. **Risk System**: Color + Icon + Consequence sentence.
4. **Device Awareness**: Camera-first on mobile, File-first on desktop with QR phone handoff.
5. **Tap-to-Verify**: Clicking "Verify" on any simplified clause highlights its original source text in `DocumentViewer.tsx`.
