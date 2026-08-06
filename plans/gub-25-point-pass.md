# COMPASS — Ganj's Utility Belt 25-point pass

**Status:** FRAME complete · TARGET gated (awaiting human)  
**Date:** 2026-08-06  
**Artifact:** [utility-belt-25-point-pass.canvas.tsx](../../.cursor/projects/l-Code-extension/canvases/utility-belt-25-point-pass.canvas.tsx) (open beside chat)

---

## RECON — System context

- MV3 extension "Ganj's Utility Belt" v3.0: popup + options + notes/report pages + background SW + content scripts on `<all_urls>`.
- ~18 content modules injected on every page; DESIGN.md documents dark cyan tokens, but options/notes use a different (emoji/light) look.
- Prior art: `docs/code-quality-review-83.md` (UI token pass) — polished surfaces without cutting product scope.
- Strongest existing code: tab grouping (`background.js`), tab sets (`tabSetSaver.js`), sticky notes (broken restore), site tools in `popup.js`.

## FRAME — Problem

**One sentence:** The extension is over-scoped — a DevTools clone, productivity suite, and site userscript pack sharing one always-on inject surface — so polish cannot fix the UX or feature quality.

**Root causes:**
1. Feature accretion without a job statement.
2. Always-on content scripts for rare tools.
3. Settings/UI that don't match behavior (orphan options, dishonest labels).
4. Visual system split across popup vs options vs content.

**Constraints:** IRON SIGHT for UI; user forbids useless feature adds; prefer cut over polish-all (Target D).

**Score:** 39/100 on 25-point scorecard · IRON SIGHT 4/12 (MATINEE).

## TARGET — Options (gate)

| ID | End-state | Recommendation |
|----|-----------|----------------|
| **A** | Surgical Cut — tabs, notes, pruned sites, pomodoro; kill DevTools clones; on-demand inject; redesign popup | **Recommended** |
| B | Tabs + Notes only | Valid minimal |
| C | Site userscript pack only | Narrow; high DOM churn |
| D | Polish everything in place | **Reject** |

## Next (after gate)

DRAFT Target A: kill list → on-demand inject → sticky URL fix → popup IA + tokens → prune site tools → thin v4.
