# Ganj's Utility Belt — Design System

Dark-first, intel/cyber visual language. Shared across popup/options (`styles.css`) and content-script UI (`content-styles.css` always-on, `tool-styles.css` on-demand).

**Host-page collision contract:** page-injected CSS must stay namespaced. `content-styles.css` (manifest, all pages) allows only `.gub-*` / `.ganj-*` / `.pomodoro-*` selectors and `--ganj-*` custom properties — no bare generic classes, no universal `*` rules. Tool UI styles (`.btn-*`, `.search-*`, `.gub-media-*`, modal chrome) live in `tool-styles.css` and are injected on demand by `openPageTool()` in `background.js`.

---

## Design tokens

### Popup & options (`styles.css` — `:root`)

| Token | Value | Use |
|-------|--------|-----|
| **Background & surface** | | |
| `--bg` | `#0c1222` | Base background |
| `--bg-page` | `#111827` | Page background |
| `--surface` | `#151b2d` | Cards, sections |
| `--surface-raised` | `#1e293b` | Elevated panels |
| **Borders** | | |
| `--border` | `#2d3748` | Default border |
| `--border-strong` | `#334155` | Emphasized border |
| **Accent** | | |
| `--primary` | `#22d3ee` | Cyan/teal accent |
| `--primary-hover` | `#06b6d4` | Hover state |
| **Semantic** | | |
| `--success` | `#10b981` | Success, go |
| `--warning` | `#f59e0b` | Warning, pause |
| `--error` | `#ef4444` | Error, cancel |
| **Neutrals** | | |
| `--gray-50` … `--gray-900` | Slate scale | Text and surfaces (50 darkest → 900 lightest) |
| **Spacing** | | |
| `--space-1` … `--space-6` | 4px, 6px, 8px, 12px, 16px, 24px | Consistent spacing |
| **Typography** | | |
| `--font-sans` | System UI stack | UI text |
| `--font-mono` | SF Mono, Cascadia, Fira Code, … | Code |
| **Motion & shadow** | | |
| `--shadow`, `--shadow-lg` | Box shadows | Depth |
| `--transition` | `all 0.2s cubic-bezier(0.4, 0, 0.2, 1)` | Transitions |

### Content scripts (`content-styles.css` + `tool-styles.css` — `:root`)

Same palette under the `--ganj-*` namespace so injected UI doesn’t clash with host page:

- **Background:** `--ganj-bg`, `--ganj-bg-page`, `--ganj-surface`, `--ganj-surface-raised`, `--ganj-bg-alt`, `--ganj-bg-inset`
- **Borders:** `--ganj-border`, `--ganj-border-strong`
- **Accent:** `--ganj-primary`, `--ganj-primary-hover`, `--ganj-primary-light`
- **Semantic:** `--ganj-success`, `--ganj-warning`, `--ganj-error` (+ `-light` variants)
- **Text:** `--ganj-text`, `--ganj-text-secondary`, `--ganj-text-muted`, `--ganj-text-faint`
- **Spacing:** `--ganj-space-1` … `--ganj-space-6` (same scale as `styles.css`)
- **Typography:** `--ganj-font-sans`, `--ganj-font-mono`
- **Chrome:** `--ganj-shadow`, `--ganj-shadow-lg`, `--ganj-radius` (10px), `--ganj-transition`

Use `--ganj-*` in all content-script UI so styling stays consistent and isolated.

---

## Modal chrome (draggable, resizable)

Content-script modals (Media Scanner, Cross-Tab Search) share one chrome system.

### Script: `modules/modalShell.js`

- **`restorePosition(el, id)`** — Restores saved position/size when opening the modal. Call **on show** (before or right after appending to DOM).
- **`makeDraggable(el, id, options?)`** — Makes the modal draggable by a handle. Options: `{ handle: '.my-handle' }` (default: `.ganj-modal-drag-handle` or `.ganj-modal-header`).
- **`makeResizable(el, id)`** — Adds a bottom-right resize handle; creates `.ganj-modal-resize-handle` if missing.

**Persistence:** `chrome.storage.local` key `modalState`: `{ [modalId]: { left, top, width, height } }`. Saves on drag/resize end (debounced ~300ms). Load `modalShell.js` before any module that uses it (e.g. in `manifest.json` content_scripts).

### Shared CSS (`tool-styles.css` — injected on demand)

- **`.ganj-modal-drag-handle`** / **`.ganj-modal-header`** — Cursor move, no text select; use as drag handle.
- **`.ganj-modal-body`** — Padding (`--ganj-space-5`), overflow auto, flex grow.
- **`.ganj-modal-resize-handle`** — Absolute bottom-right, 16×16, `nwse-resize` cursor; diagonal stripe for affordance.

**Usage:** Give the modal a wrapper (e.g. `.ganj-modal-panel`), put title/controls in a header with class `ganj-modal-header` (or use a child with `ganj-modal-drag-handle`), put content in `ganj-modal-body`. Call `restorePosition(container, 'myModalId')` on show, then `makeDraggable(container, 'myModalId')` and `makeResizable(container, 'myModalId')` after the element exists in the DOM.

---

## Popup

- **Layout:** Compact list; `styles.css` sets `min-width: 320px`, `max-width: 400px`, padding via `--space-5`.
- **Sections:** `.section` (card style), `.section.collapsible` with `.section-toggle` and `.section-body`. Collapsed state is persisted in `chrome.storage.sync` under `collapsedSections`.
- **Icons:** Emoji in markup (e.g. 🚀, 💻, 📝) and in `popup.js` for site-specific tools (`SITE_TOOLS[].icon` and per-tool `icon` + `label`). No separate icons file.
- **Tool layout:** `.tool-grid` (2 columns), `.tool-btn` for actions, `.feature-btn` for primary actions. Site-specific tools use `.site-tools-section` and `.site-tool-btn`.
- **Typography:** `h1` uses gradient text (primary → primary-hover); body uses `--font-sans`, `--gray-900` for text.

See **Key files** and **Design system** in `prompts/frontend_dev.md` for file roles and token list.
