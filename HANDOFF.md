# Pulse Finance Prototype Handoff

## Project Summary
Pulse is a mobile-first Vite + React + TypeScript prototype for AI-native personal finance guidance.

Primary user journeys:
- `Home`: month-to-date spend visibility, projected month-end risk, budget/category drilldowns, and plan entry.
- `Advice`: prompt-led advisor surface and a dedicated chat page with AI plan generation.

## Current Implementation (Latest)
- Vite + React + TypeScript app.
- Main UI in [/Users/vaibhavarora/Idea 10/src/App.tsx](/Users/vaibhavarora/Idea%2010/src/App.tsx).
- Primary styling in [/Users/vaibhavarora/Idea 10/src/styles.css](/Users/vaibhavarora/Idea%2010/src/styles.css).
- Top-level app shell now includes a `Presentation | Prototype` mode switch above the phone viewport.
- `Presentation` is the default mode.
- `PrototypeView` preserves the interactive product.
- `PresentationView` is an onboarding-style rationale flow rendered inside the same phone frame.

## Shared Shell
### Header + Status Bar
- Home, Advice, and Advice chat now all use the same shared `Header` component.
- Header padding standardized to `16px` on all sides.
- Logo is now an inline `PulseLogo` SVG rendered without any circular/container background treatment.
- Pulse logo scale was tuned down to visually match the profile icon weight.
- Status bar uses Lucide icons:
  - `Signal`
  - `Wifi`
  - `BatteryFull`
- Status icons are sized to match the time text scale and use heavier stroke.

### Mode Switcher
- Top-level segmented switcher sits above the phone viewport.
- Modes:
  - `Presentation`
  - `Prototype`
- Switcher hugs content and does not fill the width.
- Tab button styling is aligned with the recovery scenario tab treatment used inside the prototype.

## Home Screen
### Core Financial Constants
`App.tsx` single source of truth:
- `HOME_FINANCIALS`
  - `monthlyBudget: 55000`
  - `spentSoFar: 40600`
  - `projectedMonthEndSpend: 60300`
  - `daysLeft: 10`
  - `monthlyIncome: 88000`
- `HOME_DERIVED`
  - `budgetUsedPercent: 73.8`
  - `remainingBudget: 14400`
  - `projectedOverspend: 5300`
  - `projectedOverspendPercent: 9.6`
  - `safeDailySpend: 1440`
  - `currentRemainingPace: 1970`
  - `dailyReductionNeeded: 530`

### Monthly Spend Card
- Title: `Monthly spend so far`
- Value: `₹40,600`
- Subtitle: `Spending is accelerating after mid-month.`
- Card is now visually closed at the bottom and contains its own insight panel inside card margins.
- Monthly spend card has been extracted into a reusable `MonthlySpendCard` component.
- `MonthlySpendCard` is now used in:
  - Home screen
  - Presentation slide (`MAIN SIGNAL`)

Chart behavior:
- Actual spend: solid `#ff5d63`
- Projected spend: dotted coral/tangerine treatment `#f0a08d`
- Budget line: dashed `#8b8794`
- Y-axis: `₹0`, `₹55k`, `₹65k`
- X-axis: May 03, May 08, May 12, May 16, May 20, May 29
- Tooltip:
  - AI label renamed to `PULSE Prediction`
  - heading/icon color: `#6f5a3a`
  - heading weight: `500`
  - white background

Insight copy now:
- `If you keep spending like this, you are projected to spend ₹5,300 over your budget.`

### Pulse Check Treatment (Home)
All Home insight panels are now product-native and non-magical:
- Label text: `PULSE CHECK`
- Warm note background:
  - `linear-gradient(180deg, #fffaf3 0%, #fff7ee 100%)`
- Border-top / border tone: `#ece4d8`
- Title color: `#6f5a3a`
- Sparkle color: `#8a6a3d`

Applied to:
- `spending-insight-card` (inside Monthly Spend card)
- `budget-insight-card` (inside Budget Breakdown card)
- `safe-spend-insight` (inside Transactions card)

### Budget Breakdown Card
- Includes:
  - Summary + progress
  - category rows
  - in-card `PULSE CHECK`
  - body copy: `Dining, subscriptions, and cabs are creating a projected ₹5,300 overspend risk.`
  - CTA: `ASK PULSE TO EXPLAIN`
  - `See all` button below insight
- `See all` button is inset `16px` from the left and right edges.

### Transactions Card
- Includes:
  - transaction rows
  - in-card `PULSE CHECK`
  - body copy: `You can spend about ₹1,440/day to stay within budget till month-end.`
  - CTA: `CREATE A PLAN WITH PULSE`
  - `See all` button below insight
- Safe-spend insight bottom margin is `0`.
- `See all` button is inset `16px` from the left and right edges.

### Monthly Spend Insight CTA
- Label: `PULSE CHECK`
- CTA: `CREATE A PLAN WITH PULSE`

## Chat Experiences

### Home: Budget Plan Bottom Sheet
- Still available from Home recovery entrypoint.
- Behaviors retained:
  - open/close animation
  - drag-to-dismiss
  - thinking -> typing -> plan skeleton -> full plan card
  - send button swaps to stop during generation

### Home: Input Voice Mode (New)
Home chat-sheet input now supports the same voice interaction pattern as Advice chat:
- Default state: sparkle + text input + mic + send/stop
- Mic click:
  - swaps input into voice mode in the same input shell
  - requests microphone access and starts live input monitoring with `getUserMedia`
  - uses `SpeechRecognition` / `webkitSpeechRecognition` for transcript capture
  - starts as a dotted rail, then converts slot-by-slot into bars only when speech energy crosses threshold
  - bars stream from right to left and are based on measured mic amplitude
- Voice actions:
  - `X`: cancel voice mode and return to input
  - `✓`: stop recognition, wait for final STT flush, then inject recognized text into input
- Mic is disabled while AI is generating.
- Unsupported environments no longer stay stuck in fake voice mode; voice mode exits if browser speech recognition is unavailable.

### Advice: Dedicated Chat Page (New)
- New `screen` route: `adviceChat`.
- Enter/submit in Advice ask shell opens chat page that slides in from the right.
- Bottom nav hidden on this chat page.
- Chat page now uses the shared `Header` component with:
  - back arrow in the leading slot
  - centered title `Budget Plan with Pulse`
  - right-side three-dot menu icon

### Advice Ask Shell Improvements
- Input is now editable (not read-only).
- Active/focus state styling added.
- Typed text color: `#17141d`.
- Active send icon color: `#17141d`.
- Input placeholder/label now use `Ask Pulse`.

### Advice Chat Input Voice Mode (New)
- Same behavior model as Home voice mode:
  - mic -> voice mode
  - dots -> live amplitude bars only while speech is detected
  - right-to-left streamed slot track instead of decorative looping waves
  - `X` cancel
  - `✓` finalize transcript into normal input after recognizer end
- Mic default color: `#656072`.
- Mic disabled state color: `#c2bec8`.

## Advice Screen
- Uses shared Header.
- Uses the same trailing profile icon treatment as Home.
- Prompt chips updated:
  - fill `#F1EFEE`
  - border `#E0DEDC`
- Recommendations rail/button copy updated to `ASK PULSE`.
- Panel copy now references `Pulse AI`.
- Latest chats helper copy now says `Pulse chat history`.
- Existing prompt rails, plan cards, recommendations, latest chats remain intact.

## Presentation Mode
### Structure
- Rendered inside the same phone viewport as the prototype.
- Onboarding-style slide flow, not a long scroll deck.
- Uses Back / Next navigation with progress dots and final `Prototype` CTA.
- Each slide uses vertically scrollable content inside the phone.

### Slides
- Presentation content covers:
  - Design Brief
  - User Lens
  - Product Narrative
  - Home IA
  - Main Signal
  - Chart Logic
  - Pulse Check
  - Evidence
  - Visual Direction
  - Conversation Mode

### Notable Presentation Behaviors
- First slide includes two mini mobile skeletons labeled:
  - `Home`
  - `AI Conversation`
- `HOME IA` slide now shows icon + title + subtext rows for each section.
- `PRODUCT NARRATIVE` flow uses icons instead of numeric prefixes.
- `MAIN SIGNAL` slide now renders the actual prototype monthly spend card instead of a mock placeholder.
- Final slide CTA switches the top-level mode from `Presentation` to `Prototype`.

## Styling + Tokens (Notable)
- Warm off-white shell aesthetic preserved.
- Chat message token still present:
  - `--chat-msg-surface: #EFEDEB`
- Presentation-specific classes now exist for mode switcher, slide navigation, mini-phone skeletons, and rationale visuals.
- Multiple card spacings/radii updated to unify in-card insight behavior.
- Voice track dots and bars now use `#17141d`.
- Voice meter uses a single slot-based renderer so dots and bars never overlap in the same position.
- Voice stream timing was slowed and eased for a smoother right-to-left flow.

## Dependencies
- `motion` dependency remains present for sparkle animation.

## Run Commands
```bash
npm install
npm run dev
npm run build
```

## Verification Status
- Last known historical status in earlier handoff: build passed with non-blocking Vite large chunk warning.
- In this environment, local TypeScript verification passed via `./node_modules/.bin/tsc --noEmit`.
- Fresh Vite build was not re-run in this session.

## Key Files
- [/Users/vaibhavarora/Idea 10/HANDOFF.md](/Users/vaibhavarora/Idea%2010/HANDOFF.md)
- [/Users/vaibhavarora/Idea 10/src/App.tsx](/Users/vaibhavarora/Idea%2010/src/App.tsx)
- [/Users/vaibhavarora/Idea 10/src/styles.css](/Users/vaibhavarora/Idea%2010/src/styles.css)
- [/Users/vaibhavarora/Idea 10/src/components/sparkles/SparklesIcon.tsx](/Users/vaibhavarora/Idea%2010/src/components/sparkles/SparklesIcon.tsx)
- [/Users/vaibhavarora/Idea 10/src/components/sparkles/types.ts](/Users/vaibhavarora/Idea%2010/src/components/sparkles/types.ts)
- [/Users/vaibhavarora/Idea 10/Logo/ChatGPT Image May 20, 2026, 04_34_04 PM.png](/Users/vaibhavarora/Idea%2010/Logo/ChatGPT%20Image%20May%2020%2C%202026%2C%2004_34_04%20PM.png)
- [/Users/vaibhavarora/Idea 10/package.json](/Users/vaibhavarora/Idea%2010/package.json)
