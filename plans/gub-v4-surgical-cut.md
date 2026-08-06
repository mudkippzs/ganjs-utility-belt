# COMPASS FINAL — Utility Belt v4 Surgical Cut

**Codename:** none new (product rename deferred)  
**Target:** A — Surgical Cut  
**Status:** FINAL · Target A approved · Implementation in progress (v4.0 cut landed)  
**Approach:** Cut-first in-repo refactor (no parallel rewrite)

---

## Problem (FRAME)

Over-scoped MV3 extension: DevTools clones + productivity theater + site userscripts, all injected on `<all_urls>`. Polish cannot fix this.

## End-state (TARGET A)

**Job:** Browser workspace belt — tabs, page notes, site actions, optional focus.

| Keep | Kill |
|------|------|
| Tab grouping + tab sets | quickActions, cssEditor, jsEditor |
| Sticky notes + notes.html | networkTools, dataTools, colorTools, textTools |
| Pomodoro (popup/badge; overlay opt-in) | imageMagnifier, redirector, autoRefresh |
| Pruned site tools | screenshotTools (no unique win vs Chrome) |
| Cross-tab search → popup-driven | |
| Media scan → on-demand / context menu | |

## Architecture

```
popup / options / notes / report
        │
        ▼
   background.js  (alarms, menus, tabs, messaging)
        │
        ├── always-on content (minimal): constants, marked, modalShell, stickyNotes
        │                              + pomodoroOverlay only if needed
        └── on-demand executeScript: mediaScanner, crossTabSearch UI
```

- Remove `fetchUrl` / `executeInPage` with killed tools.
- Permissions: drop what only dead tools needed after cut.

## Implementation sequence

1. **Kill pass** — remove modules from manifest, popup, menus, messaging; delete module files; bump description/version.
2. **Inject model** — always-on = sticky core only; media/search via `scripting.executeScript`.
3. **Sticky fix** — one URL key; wire or remove orphan options.
4. **Pomodoro** — long-break logic; stop every-tab poll; badge-first.
5. **Popup IA** — site tools + tabs primary; notes + focus secondary; prune site gimmicks.
6. **Visual unify** — options/notes/report on shared tokens (IRON SIGHT pass).
7. **Ship** — v4.0 description: tabs · notes · sites · focus.

## STRESS (lenses)

| Lens | Finding | Mitigation |
|------|---------|------------|
| So what? | Kill without IA rewrite leaves empty popup | Popup rewrite in same epic |
| And then? | Sticky always-on still costs every page | Accept for now; later gate on enableSticky |
| Silo | Media + site downloaders duplicate | Merge download path in prune pass |
| Failure | On-demand inject fails on chrome:// | Toast + disable actions on restricted URLs |
| Security | Removing fetchUrl/executeInPage shrinks surface | Do in kill pass |
| Reversibility | Deleted modules recoverable from git | Atomic kill commit |
| Design system | Cut without token unify = half-ugly | Phase 6 before calling done |

## Success criteria

- [x] Popup has ≤4 primary sections; no DevTools entries
- [x] Content script list ≤5 always-on files
- [x] Sticky notes restore on revisit (path-stable URL)
- [x] Pomodoro long-break works or UI removed
- [x] No `fetchUrl` / MAIN-world eval
- [x] Options/notes/report share popup token palette (options already aligned)

## Follow-ups (not blocking v4 cut)

- IRON SIGHT typography (display/UI/mono faces) beyond system stack
- Tab-set update-in-place + confirm open-all
- Replace remaining `alert()` with toasts
- Emoji cleanup on options/notes headers


## Issue breakdown (local; no tracker unless asked)

1. Kill modules + menus + popup
2. On-demand inject + permission trim
3. Sticky URL + options
4. Pomodoro correctness
5. Popup IA + site prune
6. Visual unify + v4 ship
