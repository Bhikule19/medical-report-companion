---
name: Medical Report Companion System
colors:
  surface: '#fbf9fa'
  surface-dim: '#dbd9db'
  surface-bright: '#fbf9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f5'
  surface-container: '#efedef'
  surface-container-high: '#eae7e9'
  surface-container-highest: '#e4e2e4'
  on-surface: '#1b1b1d'
  on-surface-variant: '#44474c'
  inverse-surface: '#303032'
  inverse-on-surface: '#f2f0f2'
  outline: '#75777d'
  outline-variant: '#c5c6cd'
  surface-tint: '#515f74'
  primary: '#1d2b3e'
  on-primary: '#ffffff'
  primary-container: '#334155'
  on-primary-container: '#9eadc5'
  inverse-primary: '#b9c7e0'
  secondary: '#006a61'
  on-secondary: '#ffffff'
  secondary-container: '#86f2e4'
  on-secondary-container: '#006f66'
  tertiary: '#38270a'
  on-tertiary: '#ffffff'
  tertiary-container: '#503d1e'
  on-tertiary-container: '#c3a881'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3fd'
  primary-fixed-dim: '#b9c7e0'
  on-primary-fixed: '#0d1c2f'
  on-primary-fixed-variant: '#3a485c'
  secondary-fixed: '#89f5e7'
  secondary-fixed-dim: '#6bd8cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#fcdeb3'
  tertiary-fixed-dim: '#dfc299'
  on-tertiary-fixed: '#281901'
  on-tertiary-fixed-variant: '#574424'
  background: '#fbf9fa'
  on-background: '#1b1b1d'
  surface-variant: '#e4e2e4'
typography:
  display:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  touch-target: 44px
  gutter: 1.5rem
  margin-page: 2rem
  card-padding: 1.5rem
  stack-gap: 1rem
---

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

- **Reassuring, never alarming.** A user has just received a medical report; they are anxious. The UI should feel calm and focused.
- **Plain words. No jargon.** "Save", "Upload", "Sign in" — not "Submit", "Persist", "Authenticate".
- **Dignified, not cute.** This is a health context, not a productivity app. No exclamation marks, no emoji, no playful microcopy.
- **Honest about uncertainty.** When the assistant doesn't know, the UI says so cleanly.

## 4. Visual direction (suggestions, not prescriptions)

A starting point — the design AI should feel free to depart from this if a stronger direction emerges.

- **Palette:** default to **Light Mode**. Primarily clean whites and soft gray neutrals. A single muted accent (soft teal `#0D9488`). Use a deep slate (`#334155`) for high-contrast text and primary actions. Favor a bright, airy aesthetic that feels transparent and clinical.
- **Typography:** humanist sans-serif. The current default is Manrope for headlines and Inter for body text. Body type should feel large by default — base font 18 px (1.125 rem) so older readers can read without effort.
- **Spacing:** generous. Components breathe. Touch targets at least 44×44 px on mobile.
- **Density:** low. Whitespace > information density. Lists never feel cramped.
- **Imagery:** avoid stock photography. Prefer abstract, minimal, calm patterns that work well on light surfaces.
- **Affordances:** use soft shadows and light borders. Higher elements appear to float slightly above the surface. Favor subtle gray borders (`#E2E8F0` style) to define container boundaries.
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

**Layout:** centred card on a clean, light, and calm background. Card max-width about 28 rem.

**Card contents (top to bottom):**
1. Product name in display weight: "Medical Report Companion".
2. One-line subhead: "Sign in to upload a report and chat about it."
3. *Optional* error banner (only when `?error=oauth_failed` or `?error=session_expired` in URL):
   - Light red background, deep red text, 1-2 sentences.
4. Single primary button: **"Continue with Google"** with the Google G-mark on the left. Uses the Deep Slate background.

**States:**
- Idle (default).
- Pending — button is disabled, label may swap to "Signing in…".
- Error — banner above the button.

---

### 6.2 Home page (`/`)

The most important page. It has two distinct visual modes:

#### Mode A — empty (no report loaded)

**Layout:**
- Top header bar (Light gray or white with a subtle bottom border).
- Two-column body: left = history sidebar, right = upload zone.

**Header bar (left to right):**
- Product name "Medical Report Companion".
- Right cluster:
  - **Language picker** — labelled "Language" with a select control.
  - **Find nearby** link.
  - **Settings** link.
  - **User menu** — email address + Sign out button.

**History sidebar (left column):**
- **"New report"** primary button at the top (Deep Slate style).
- Heading: "Past reports" (small, all-caps, muted gray).
- List of past reports. Active item is highlighted with a soft teal or light gray background.

**Right column — upload state:**
- Card with dashed border (Slate-300), centred on a white background.
- Heading: "Upload report".
- Sub-text: "PDF or image, up to 10 MB".

#### Mode B — report loaded (the working surface)

**Layout:** identical header.
- Left = history sidebar.
- Right = split between **summary card** and **chat panel**.

**Summary card:**
- Card with white surface and soft ambient shadow, generous padding.
- Header row: "Source: English" on left, "3 pages" + **speaker icon** on right.
- Body: the streaming summary text in Deep Slate.

**Chat panel:**
- Card with same surface as summary.
- Body: a scrollable column of message bubbles.
  - User messages on the right with a soft teal or light slate bubble.
  - Assistant messages on the left with a very light gray bubble.
- Input row at the bottom (always pinned):
  - **Mic button** (square, light gray border).
  - **Text input** (outlined, teal focus).
  - **Send button** (primary Deep Slate, "Send" label).

---

### 6.3 Nearby page (`/nearby`)

**Purpose:** show labs or hospitals within 5 km of the user.

**Layout:**
- Header: "Nearby" + a "Back" link.
- Filter row: **Hospitals** | **Labs**. Selected chip is Deep Slate; inactive is outlined gray.
- Below the chips: **map** (light themed Google Maps surface) with pins.
- Below the map: **list of results** on white background.

---

### 6.4 Settings page (`/settings`)

**Purpose:** privacy toggles + display preferences.

**Layout:**
- Header: "Settings" + "Back" link.
- Two cards stacked: **Privacy** then **Display**.

**Display card:**
- Heading: "Display".
- Three buttons (radio-group): **Standard** | **Large** | **Extra-large**.
- Active button uses the Teal secondary color or Deep Slate.

---

### 6.5 Auth callback (`/auth/callback`)

A transient page. Renders only a centred "Signing you in…" message on the light, clean background.

---

## 7. Reusable components and their states

### Confirm dialog
- Modal centred on a light gray dimmed scrim.
- Destructive actions ("Delete") use a clear red tone.

### Voice input button
- Idle: microphone icon, light gray border.
- Recording: red border, red dot icon.
- Busy: spinner.

### Sidebar history item
- Title (bold).
- Timestamp (small, muted).
- Active state: light teal or gray background.

---

## 8. Cross-cutting concerns

### 8.1 Languages and writing systems
- Support for 14 languages including RTL (Arabic).
- Ensure fonts (Inter/Manrope) handle multiple scripts gracefully in light mode.

### 8.2 Text scaling
- Multipliers: Standard (1.125x), Large (1.4x), Extra-large (1.625x).
- Containers must expand to prevent text clipping in light mode.

### 8.3 Accessibility
- WCAG AA contrast is critical on light backgrounds.
- High-visibility focus rings (Teal `#0D9488`).

---

## 9. What the design AI should output
1. **Light Mode mobile and desktop layouts**.
2. **All visible states** — empty, loading, populated, error.
3. **Component sheet** showing light mode variants.
4. **RTL variant** for Arabic content.

---

## 10. Technical context for the design AI
- **Framework:** Next.js 15, Tailwind CSS v3.
- **Color Mode:** Default light mode implementation.
- **Icons:** Inline SVGs.
