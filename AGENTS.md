# LegalLens — Workspace Agent Directives & Rules (`AGENTS.md`)

## STRICT RESPONSIVE LAYOUT & RATIO LOCK (LOCKED BY USER DIRECTIVE)

> [!CAUTION]
> **HARD RULE & IMMUTABLE INVARIANT**:
> The responsive design system, device screen ratios, layout padding, breakpoint thresholds, and display mechanics documented in [`RESPONSIVE.md`](file:///e:/LegalLens/RESPONSIVE.md) and [`DESIGN.md`](file:///e:/LegalLens/DESIGN.md) are **PERMANENTLY LOCKED**.
>
> When implementing ANY future changes, feature additions, or updates in LegalLens:
> 1. **PRESERVE ALL SCREEN RATIOS**: You MUST NOT modify or break the layout ratios, padding tokens (`px-4 sm:px-6 md:px-8`), or container dimensions across any viewport size (`mobile` 320–480px, `mobile-lg` 481–767px, `tablet` 768–1023px, `laptop` 1024–1439px, `desktop` 1440px+).
> 2. **NO SIDE EFFECTS ON OTHER BREAKPOINTS**: Shared responsive utility classes, flex-shrink rules, or navbar/header/footer mechanics must NEVER be altered to solve a single-screen issue.
> 3. **PURE CSS RESPONSIVE ONLY**: Always use pure CSS Tailwind breakpoint classes (`sm:`, `md:`, `lg:`, `xl:`), never JS width state listeners that can go stale during viewport resizing or DevTools device-preset switching.
> 4. **LOCKED UNTIL INSTRUCTED**: This rule is strictly active and locked. Do NOT alter device layout ratios or responsive systems unless the user explicitly commands a responsive system rebrand.
