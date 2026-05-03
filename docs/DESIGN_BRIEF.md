# Medical Report Companion — Design Brief

**Use this document with:** Claude Design, Google Stitch, v0.dev, Galileo, Uizard, or any design AI that accepts a structured product brief.

**How to use:** copy the entire file (or just the sections you need) into the design tool. The tool should generate page mockups; bring those back to the engineering side and they'll be implemented in Next.js + Tailwind.

---

## 1. Product summary

**Medical Report Companion** is a web app that helps people understand medical lab reports.

A user uploads a PDF or photograph of a medical report. The app extracts the text, generates a plain-language summary in the user's chosen language, and lets them ask follow-up questions in chat (typed or voice). The user can also find labs and hospitals nearby.

The app is **not** a medical-advice tool. It explains. It does not diagnose, prescribe, or recommend specific actions.

## 2. Target user

- **Primary:** Indian patients who receive medical reports in English they cannot fully read — often elderly, often lower-literacy in English. They want help reading their own (or a relative's) reports without going back to the doctor for every term.
- **Secondary:** International patients with similar needs — the app supports 14 languages.
- **Devices:** smartphone is the dominant device, but desktop should also feel polished.
- **Network:** sometimes slow / unreliable Indian mobile data; designs should not feel broken when content is loading slowly.

## 3. Voice and tone

- **Reassuring, never alarming.** A user has just received a medical report; they are anxious. The UI should feel calm.
- **Plain words. No jargon.** "Save", "Upload", "Sign in" — not "Submit", "Persist", "Authenticate".
- **Dignified, not cute.** This is a health context, not a productivity app. No exclamation marks, no emoji, no playful microcopy.
- **Honest about uncertainty.** When the assistant doesn't know, the UI says so cleanly.

## 4. Visual direction (suggestions, not prescriptions)

A starting point — the design AI should feel free to depart from this if a stronger direction emerges.

- **Palette:** primarily neutral / warm-grey. A single muted accent (e.g. soft teal, deep indigo, or sage green — pick one). Avoid bright reds and oranges except for warnings. Avoid pure white; prefer a near-white off-cream for backgrounds (`#FAFAF8` style).
- **Typography:** humanist sans-serif. The current default is Geist Sans / Inter / system-ui. Body type should feel large by default — base font 18 px (1.125 rem) so older readers can read without effort.
- **Spacing:** generous. Components breathe. Touch targets at least 44×44 px on mobile.
- **Density:** low. Whitespace > information density. Lists never feel cramped.
- **Imagery:** avoid stock photography of doctors and stethoscopes. Avoid medical iconography that signals "this is a medical service" too loudly. Prefer abstract, minimal, calm.
- **Affordances:** use real shadows sparingly; favour borders and very soft shadows over heavy drop shadows.
- **Motion:** very little. Streaming text already provides rhythm. Avoid bouncy or spring animations.

## 5. Routes

| Route | Auth-gated? | Purpose |
|---|---|---|
| `/sign-in` | No | Google sign-in. Optional error banner. |
| `/auth/callback` | No | OAuth code exchange. Renders only "Signing you in…" while it works. |
| `/` | Yes | Main work surface: upload, summary, chat, history sidebar. |
| `/nearby` | Yes | Find labs or hospitals near the user. |
| `/settings` | Yes | Privacy + Display preferences. |

There is **no** dedicated landing page; an unauthenticated user is bounced to `/sign-in`.

---

## 6. Page-by-page specifications

### 6.1 Sign-in page (`/sign-in`)

**Purpose:** the only entry point for unauthenticated users.

**Layout:** centred card on a calm background. Card max-width about 28 rem.

**Card contents (top to bottom):**
1. Product name in display weight: "Medical Report Companion".
2. One-line subhead: "Sign in to upload a report and chat about it."
3. *Optional* error banner (only when `?error=oauth_failed` or `?error=session_expired` in URL):
   - Soft red background, dark red text, 1-2 sentences. Examples: "Sign-in failed. Please try again." / "Your session expired. Please sign in again."
4. Single primary button: **"Continue with Google"** with the Google G-mark on the left.

**States:**
- Idle (default).
- Pending — button is disabled, label may swap to "Signing in…", optional small spinner. The user is about to be redirected, so this state is brief.
- Error — banner above the button.

**Notes:** no "create account / forgot password" flows — the only auth method is Google OAuth.

---

### 6.2 Home page (`/`)

The most important page. It has two distinct visual modes:

#### Mode A — empty (no report loaded)

A fresh user, or a returning user who clicked "New report".

**Layout:**
- Top header bar.
- Two-column body: left = history sidebar, right = upload zone (in an empty / call-to-action style).

**Header bar (left to right):**
- Product name "Medical Report Companion" (display weight, slightly smaller than on the sign-in page).
- Right cluster:
  - **Language picker** — labelled "Language" with a select control. Default value is the user's last choice (or `हिन्दी`). Shows the selected language's native script. Dropdown lists all 14 languages by native name.
  - **Find nearby** link (text-link style, no button chrome).
  - **Settings** link (same style).
  - **User menu** — email address + Sign out button in a row.

**History sidebar (left column):**
- **"New report"** primary button at the top.
- Heading: "Past reports" (small, all-caps, muted).
- List of past reports (or empty state: "No past reports yet.").
- Each row: report title (filename or "Report from [date]") on top, small timestamp ("May 2, 14:30") below. On hover an "×" delete affordance reveals.

**Right column — upload state:**
- Card with dashed border, centred.
- Heading: "Upload report".
- Sub-text: "PDF or image, up to 10 MB".
- File picker affordance (drag-and-drop area or system file dialog).
- Hidden until something happens — error message in red below if the file is too big or the wrong type.

#### Mode B — report loaded (the working surface)

After upload completes, or when a history item is clicked.

**Layout:** identical header. Body is a three-column-feel layout but actually:
- Left = history sidebar (same as before — the active item is highlighted).
- Right = a 2-column area split between **summary card** and **chat panel**. On mobile this collapses to summary stacked above chat.

**Summary card:**
- Card with soft shadow, white background, generous padding.
- Header row inside the card:
  - Left: "Source: English" (or whatever the source language was detected as).
  - Right: "3 pages" + small **speaker icon** that plays the summary as audio when clicked.
- Body: the streaming summary text. While streaming, a single thin pulsing cursor character at the end indicates progress.

**Chat panel:**
- Card with same surface as summary.
- Header row:
  - Left: "Ask a question".
  - Right: small **"Clear chat"** text-link (only visible when there's at least one message).
- Body: a scrollable column of message bubbles.
  - User messages on the right with a darker bubble (slate-700, white text).
  - Assistant messages on the left with a light bubble (slate-100, dark text). A small **speaker icon** sits beside each assistant bubble on the right.
  - Empty state: a subtle hint "Ask anything about your report. The assistant uses only the report contents."
- Input row at the bottom (always pinned):
  - **Mic button** (square, 40×40, slate border).
  - **Text input** "Type your question…".
  - **Send button** (primary, dark slate, "Send" label).

**Mic button states:** idle (microphone icon), recording (red dot icon, red border), busy/transcribing (spinner). Hidden entirely if MediaRecorder is not supported.

**Speaker button states:** idle (speaker icon), loading (spinner), playing (stop / square icon).

**Streaming behaviour:** while the assistant is replying, the input + Send + mic are disabled. The "Clear chat" button is disabled too. The current assistant message grows token-by-token.

**Error patterns on this page:**
- "Reading your report…" (small grey text below the upload card while OCR runs).
- Red banner: "Couldn't save your report. [reason]" / "Couldn't read any text from this document."
- Amber banner: "Couldn't load history: [reason]" with inline "Retry" link.

---

### 6.3 Nearby page (`/nearby`)

**Purpose:** show labs or hospitals within 5 km of the user.

**Layout:**
- Header: "Nearby" + a "Back" link to `/`.
- A two-chip filter row: **Hospitals** (active by default) | **Labs**. Selected chip is dark slate / white text; inactive is white / slate text with light border.
- Permission banner (amber) if the user hasn't granted geolocation: "Allow location access to find places nearby. Update your browser settings and reload." with a "Retry" button.
- Below the chips: **map** (Google Maps surface, ~320 px tall) with the user's location pinned in dark slate and each result pinned in red.
- Below the map: **list of results**, each row:
  - Left column: name (bold), formatted address (muted), distance e.g. "1.2 km" (small, top-right).
  - "Open in Maps" text-link below.

**States:**
- Permission denied / not granted → only banner + chips visible; no map, no list.
- Loading → small "Searching…" line under the map.
- Empty results → "No labs found within 5 km." inside the list area.
- Generic error → red inline banner.

---

### 6.4 Settings page (`/settings`)

**Purpose:** privacy toggles + display preferences.

**Layout:**
- Header: "Settings" + "Back" link to `/`.
- Two cards stacked: **Privacy** then **Display**.

**Privacy card:**
- Heading: "Privacy".
- Subtext: "Choose what gets saved to your account. Changes apply immediately."
- Three checkbox rows:
  1. **Save reports to your history.** "When off, uploaded reports stay only in your current browser tab. Closing the tab loses them."
  2. **Save chat history.** "When off, your questions and the assistant's replies are not saved. Summaries still are."
  3. **Save voice transcripts.** "When off, anything you say will not be transcribed or saved."
- Each row: large checkbox left, label + description on the right.
- Optional toast (amber, non-modal): "Couldn't save your preference: [reason]" if a write fails.

**Display card:**
- Heading: "Display".
- Subtext: "Make text bigger if it is hard to read. The change applies right away and is remembered on this device."
- Three buttons (radio-group semantics, only one active at a time): **Standard** | **Large** | **Extra-large**.
- Active button: dark slate background, white text. Inactive: white background, slate text, light border.

---

### 6.5 Auth callback (`/auth/callback`)

A transient page. Renders only a centred "Signing you in…" message on the same off-cream background. No header, no footer. Redirects to `/` on success or back to `/sign-in?error=oauth_failed` on failure.

---

## 7. Reusable components and their states

### Confirm dialog (used for delete report, clear chat)

A modal centred on a softly dimmed scrim. Card max-width 28 rem.

- Title (bold).
- Body (1-2 sentences explaining the consequence).
- Optional inline error banner (when retry-able).
- Two buttons at the bottom-right: secondary **Cancel** (outline), primary **[Action label]** (solid). Action button is red-toned for destructive actions ("Delete", "Clear chat").

States: open / closed; pending (both buttons disabled); error (inline banner above buttons, dialog stays open).

### Sign-in button

Single primary button. Dark slate background. White text. Label: "Continue with Google". Optionally with a small Google G mark on the left. Disabled while a redirect is pending.

### User menu

Two elements in a row, both small text:
- The user's email address.
- "Sign out" button styled as a thin outline button.

### Language picker

`<select>` element styled to match the rest of the UI (white bg, slate border, rounded). Native script labels for all 14 options.

When a report is loaded, changing this picker re-streams the summary in the new language and the chat panel switches with it. The same dropdown is used for everything; there is no second per-report picker.

### Voice input button

Square 40×40 button.
- Idle: microphone icon, slate border.
- Recording: red border, red dot or small filled square icon, light red background.
- Busy (transcribing): spinner.
- Hidden when MediaRecorder API is unavailable.

### Speak button (read-aloud)

Smaller (32×32), text-only. Speaker icon → spinner → stop icon as state changes.

### Sidebar history item

A row inside a card-style sidebar.
- Title (bold).
- Timestamp (small, muted).
- Active state: thicker slate-700 border + slightly darker bg.
- Trailing × button (delete affordance) reveals on hover (always-visible on touch devices).

### Text-scale picker

Three pill buttons grouped horizontally. Same active/inactive treatment as the type filter on the Nearby page.

---

## 8. Cross-cutting concerns

### 8.1 Languages and writing systems

The app supports 14 languages:

| Code | Name | Script |
|---|---|---|
| en | English | Latin |
| hi | हिन्दी | Devanagari |
| ta | தமிழ் | Tamil |
| te | తెలుగు | Telugu |
| bn | বাংলা | Bengali |
| mr | मराठी | Devanagari |
| es | Español | Latin |
| fr | Français | Latin |
| de | Deutsch | Latin |
| pt | Português | Latin |
| ru | Русский | Cyrillic |
| zh | 中文 | Han |
| ar | العربية | Arabic |
| ja | 日本語 | Japanese (mixed) |

**Important:**
- Designs must look correct with **mixed scripts**: a Devanagari summary alongside Latin chat input is normal.
- **Arabic is right-to-left.** Designs should mirror cleanly when the active content is Arabic. Layout, alignment, and chevrons all flip. (The current implementation does NOT handle this yet; the design AI should produce a flipped variant we can implement.)
- Native-script labels in the language picker are not transliterated; they appear in the script of the language. Make sure the picker has enough horizontal space for "العربية" or "中文" without truncation.

### 8.2 Text scaling

Three discrete sizes, set once in `/settings`. Multiplier applied via a CSS variable on `<html>`:
- Standard (1.125×, ≈ 18 px base)
- Large (1.4×, ≈ 22.4 px base)
- Extra-large (1.625×, ≈ 26 px base)

Designs should be visualised at all three sizes if possible. Critically: **buttons and inputs should not become awkwardly cramped at Extra-large**. Avoid fixed widths on text-heavy components.

### 8.3 Accessibility

- WCAG AA contrast for body text and primary actions.
- Focus rings visible (a soft slate outline, not a removed `outline: none`).
- Every interactive element has an accessible name (icon-only buttons need `aria-label`).
- Modal dialogs trap focus and respond to Escape.
- Form fields have visible labels (or `aria-label` if visually hidden).

### 8.4 Motion

- Streaming text already produces rhythm. Don't layer additional animation on top.
- Use `prefers-reduced-motion` to disable any non-essential transitions.
- Loading spinners are acceptable but should be small and non-intrusive.

### 8.5 Empty / loading / error patterns

Three universal patterns:
- **Loading:** small grey text or a thin spinner. Never a full-screen skeleton — the app's surfaces are small enough that skeletons feel heavy.
- **Empty:** explanatory sentence inside the would-be content area, plus the relevant CTA when applicable.
- **Error:** banner inline with the affected component, with a retry affordance when retry is meaningful. Red for destructive errors, amber for warnings.

---

## 9. What the design AI should output

For each page above, ideal deliverables are:

1. **Mobile and desktop layouts** (and an iPad-ish mid-size if possible).
2. **All visible states** — empty, loading, populated, error.
3. **A component sheet** showing the reusable components in each state.
4. **Light theme is required.** Dark theme is welcome but secondary.
5. **An RTL variant** of the Home page when the language is Arabic (if the tool supports it).

Avoid:
- Dashboards / analytics charts (this app has none).
- Onboarding tutorials, tooltips, or coach-marks.
- Marketing content / testimonials / pricing.
- Cookie banners.

---

## 10. Technical context for the design AI

This is helpful if the tool generates code:

- **Framework:** Next.js 15 (App Router), React 19, TypeScript.
- **Styling:** Tailwind CSS v3 utility classes. No CSS-in-JS, no inline `style={...}` (except for the `--font-scale` variable). No `@tailwindcss/typography`.
- **Components:** plain functional React components in `src/components/`. No design system / shadcn / mui.
- **Icons:** small inline SVGs as components (no icon-font dependency).
- **Routing:** App Router file-based routes (`src/app/<route>/page.tsx`).
- **Server vs client:** every interactive page is a Client Component (`'use client'`). The legal pages are server components.

Designs are easier to implement when output as either:
- Plain HTML with Tailwind utility classes, or
- React JSX with Tailwind utility classes.

Avoid CSS modules, Sass, or non-Tailwind utility libraries.

---

## 11. Out of scope for this design pass (currently hidden in the product)

These exist in the codebase but are intentionally not surfaced. The design AI does NOT need to design for them yet — they may come back later.

- Privacy and Terms pages (routes still resolve at `/privacy` and `/terms` but no in-app links lead to them).
- The first-time consent interstitial after sign-in.
- Footer with policy links.

---

## 12. Page priority for the design pass

If the AI can only do a subset, this is the order:

1. **Home page (`/`)** — both empty and report-loaded modes. This is where users spend 90% of their time.
2. **Sign-in (`/sign-in`)** — first impression.
3. **Settings (`/settings`)** — privacy + display.
4. **Nearby (`/nearby`)** — map + list.

The auth-callback page is a one-screen interstitial — designing it is optional.
