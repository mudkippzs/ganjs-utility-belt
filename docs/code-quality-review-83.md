# Code Quality Review — Issue #83 (UI Overhaul)

**Author:** code-quality  
**Branch:** `issue/83-code-quality`  
**Scope:** Design tokens (styles.css, content-styles.css), modalShell.js, popup (popup.html, popup.js), options/notes/report CSS, form and modal updates in content-script modules.

---

## Summary

- **Critical:** 0
- **Suggested:** 4
- **Minor:** 5
- **Non-breaking fixes applied:** Accent color alignment, one DRY improvement (site-tools heading class).

---

## Findings

### Critical

*None.*

---

### Suggested

1. **Options / Notes / Report pages not using shared design system**  
   `options.html`, `notes.html`, and `report.html` use inline `<style>` with hardcoded colors (e.g. `#3b82f6`, `#2563eb`, `#f5f7fa`) instead of `styles.css` and design tokens. Popup uses the dark intel/cyber palette; these pages use a light palette. For consistency and DRY, consider linking `styles.css` and using tokens, or introducing a small shared “options/notes/report” CSS that uses the same token names (and optionally a light-theme override).

2. **Duplicate form/button/section patterns across options, notes, report**  
   Button styles (primary/secondary/danger), section cards, inputs, and toasts are reimplemented in each page. Consider a shared `options-styles.css` (or reusing `styles.css` with a body class) so one change updates all three.

3. **Content script accent color drift (fixed in this branch)**  
   Several spots used blue `rgba(37, 99, 235, …)` instead of the design system primary (cyan/teal `#22d3ee`). These have been updated in `styles.css` and `content-styles.css` to use the primary tint. `screenshotTools.js` still has one inline highlight using blue (line ~177); consider switching to a CSS class or the same cyan tint for consistency.

4. **Prefix consistency in content UI**  
   Content-injected UI uses both `ganj-*` (e.g. `ganj-modal-*`, `ganj-ext-*`) and `gub-*` (e.g. `gub-note-*`, `gub-ace-wrap`). Both are namespaced; picking one convention (e.g. `ganj-*` everywhere) would simplify naming and docs.

---

### Minor

1. **Magic numbers in styles.css**  
   Some margins/padding use raw `px` (e.g. `margin: 16px 0`, `padding: 12px`) where the spacing scale could be used (`var(--space-5)`, `var(--space-4)`). Low priority; can be normalized gradually.

2. **popup.js site-tools heading (fixed in this branch)**  
   The site-tools section used an inline `style="display:flex;..."` on the heading. Replaced with a class `.site-tools-heading` and matching rule in `styles.css` for consistency with the rest of the popup.

3. **modalShell.js**  
   No issues. Clear JSDoc, single responsibility, consistent naming; exports and storage key are clear.

4. **frontend_dev.md alignment**  
   Design tokens, structure, and conventions in `frontend_dev.md` are followed: `styles.css` and `content-styles.css` roles, token names, `.section` / `.section-toggle` / `.section-body`, `.tool-grid` / `.tool-btn` / `.feature-btn`. Content scripts use the documented patterns.

5. **.empty-state padding**  
   `styles.css` uses `padding: 12px`; notes/report use different values. Could standardize on `var(--space-4)` or similar if options/notes/report ever share the same CSS.

---

## Positive Notes

- Design tokens in `styles.css` and `content-styles.css` are well structured; content uses `--ganj-*` to avoid clashes with host pages.
- modalShell.js is clean and documented; draggable/resizable behavior and persistence are easy to follow.
- Popup and content modals use consistent close-button and header patterns (e.g. `.tools-close`, `.refresh-close`, etc.).
- Accessibility: `styles.css` includes `prefers-reduced-motion`, `prefers-contrast`, and `:focus-visible`; modalShell resize handle uses `aria-hidden="true"`.
- No obvious regressions found in the reviewed flow (popup → tool toggles, options, notes, report).

---

## Recommendations

1. When touching options/notes/report, refactor to shared CSS and design tokens (suggested items 1–2).
2. In `screenshotTools.js`, replace the blue highlight color with the design primary (or a shared class) for consistency.
3. Optionally standardize content UI prefix to `ganj-*` and rename `gub-*` in a single pass to avoid selector drift.

---

## Commits (this branch)

- **0df2bf4** — Code quality pass #83: accent alignment, DRY site-tools heading, review doc  
  - Accent color alignment: pomodoro timer text-shadow and content-styles focus/hover glows use primary (cyan/teal) instead of blue.  
  - DRY: site-tools heading uses `.site-tools-heading` class instead of inline style.  
  - Add this review document.

After pushing, link commit `0df2bf4` to issue #83 and set status to **done** (BugTracker was unreachable from this environment).
