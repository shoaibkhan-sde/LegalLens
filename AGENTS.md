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

## MANDATORY PARALLEL BILINGUAL (ENGLISH & HINDI) SUPPORT

> [!IMPORTANT]
> **PERMANENT WORKSPACE DIRECTIVE**:
> LegalLens natively supports both English and Hindi across all document ingestion, Guard 1 classification, clause chunking, risk scoring, grounding, and AI synthesis features.
>
> Whenever implementing ANY change, pipeline optimization, guardrail check, classifier rule, or test suite in LegalLens:
> 1. **PARALLEL HINDI LOGIC REQUIRED**: You MUST implement and maintain the equivalent parallel logic, keyword rules, and prompt instructions for Hindi (Devanagari script) alongside English.
> 2. **NO ENGLISH-ONLY PIPELINE LOGIC**: No classifier, parser, or risk evaluator may be built or modified for English alone. Multi-page document handling, document extraction, Guard 1 gates, and regression tests MUST cover both English and Hindi documents equally.

## STRICT CLAUSE MEANING & ZERO-UNAVAILABLE FALLBACK SYNTHESIS LOCK (LOCKED BY USER DIRECTIVE)

> [!CAUTION]
> **HARD RULE & IMMUTABLE INVARIANT**:
> The clause meaning synthesis, structural explanation validation, and domain-aware fallback logic implemented in `synthesizeDocumentAnalysis` and `generateHighQualityDomainExplanation` in [`astraBackend.ts`](file:///e:/LegalLens/server/src/services/astraBackend.ts) are **PERMANENTLY LOCKED BY USER DIRECTIVE**.
>
> When implementing ANY future changes, feature additions, or updates in LegalLens:
> 1. **ZERO UNAVAILABLE EXPLANATIONS**: Every clause in every document MUST always have a valid, non-null `simple_explanation` and `very_simple_explanation`. Under no circumstances may any clause be returned with `meaning_error: true` or `"Meaning temporarily unavailable for this clause"`.
> 2. **DO NOT MODIFY UNTIL EXPLICITLY INSTRUCTED**: Future code changes, pipeline optimizations, or refactorings MUST NOT touch, modify, or alter `generateHighQualityDomainExplanation()`, structural validation, or the fallback explanation synthesis logic until the user explicitly says "ok" or commands a logic update.
> 3. **NO TEMPLATE LEAD-INS OR VERBATIM QUOTES**: Explanations must never contain prohibited structural lead-in templates (e.g. `"This clause specifies binding obligations for..."`) or verbatim quote restatements.

