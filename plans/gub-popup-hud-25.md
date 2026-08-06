# Popup HUD — 25-point layout pass (IRON SIGHT)

Target: kill the scrollable junk drawer; ship a fixed command surface.

1. Fixed 340×520 viewport — no body scroll
2. Void surface `--hud-surface-0` + ambient cyan radial (not flat slate)
3. IRON SIGHT tokens in `tokens.css` (verbatim palette)
4. Three fonts only: Orbitron / Rajdhani / Share Tech Mono
5. Glass panels (`backdrop-filter` + cyan glass border)
6. Holo sweep bound to motion budget (respects `prefers-reduced-motion`)
7. HUD corner brackets on OPS + FOCUS panels
8. LCARS-style panel chrome: bar + CODE // title
9. Top status strip: BELT brand + live tab count + mode badge
10. Status pulse only when FOCUS/BREAK (data-bound, not decorative idle glow)
11. Mode badge drives focus panel border/timer color (instrument, not wallpaper)
12. Site tools demoted to context chip rail (hidden off-site — context-aware)
13. OPS as 3×2 action constellation (tiles, not list rows)
14. Meaningful tooltips (meaning/risk/scope) on every control
15. Sets behind toggle tile — not always-on scroll bait
16. Sets list is the only scroll region (capped height)
17. Focus as bottom mission instrument (timer mono = ground truth)
18. Engage / Abort language + disabled Engage without objective
19. Float/Auto as mono micro-checks (settings, not chrome clutter)
20. Options as gear in chrome (footer deleted)
21. No emoji headers / gradient title gimmicks
22. Matte cyan tiles; glow reserved for hover/active
23. `:focus-visible` cyan rings on all interactives
24. Empty sets = mono "NO SETS STORED" (honest empty)
25. Fuidgetry cut: no fake shortcuts column, no accordion sections, no stacked cards of equal weight

**IRON SIGHT three-axis (popup):** Sci 3 · Fi 3 · Interfaces 3 → **9/12 MUST-SEE** (fonts + glass land; Director schema still minimal).
