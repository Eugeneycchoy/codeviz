CodeViz is a web application for developers and learners who need to understand an unfamiliar codebase quickly. Its name is CodeViz. Users add a repository either by dragging and dropping a ZIP file or by pasting a remote Git URL. The app then builds a file-level dependency graph where each node is a file and each edge shows import direction. When the user clicks any file node, a slide-in panel appears with an AI-generated plain-English explanation of that file; explanations are cached so repeat clicks are instant. The app supports signing in with GitHub or Google. Signed-in users have a dashboard where they see their saved repositories and recently viewed repos. The design system is light theme, minimal, with a premium spacious feel. Use a soft slate or blue accent for primary actions and highlights. Typography is clean and readable; card and control styling should follow shadcn-style patterns: subtle borders, light shadows, rounded corners. Spacing is generous to create a premium feel. Navigation is a single top navbar across the app; repository lists use cards; the explanation UI is a slide-in panel from the right, not a modal.

---

PAGE 1: Landing (/)

The top of the page shows a top navbar that spans the full width. The navbar has the application name CodeViz on the left, and on the right two links or buttons: one for Sign in and one that might say Get started or similar. The navbar has a light background, subtle bottom border, and the logo or name is clearly the brand. Below the navbar the main content is centered in the middle of the viewport with plenty of whitespace above and below.

The primary headline is a short phrase such as "Drop a repo, understand it instantly" or similar. Under it a supporting line of text explains interactive dependency graphs with AI-powered explanations. The main interactive area is a large dropzone: a bordered, dashed or lightly shaded rectangle that invites the user to drag and drop a ZIP file here. Inside or near the dropzone, example hint text like "Drag your repo ZIP here (max 50 MB)" and perhaps "or" as a separator. Below the dropzone there is a single text input for a Git URL, with placeholder text such as "https://github.com/owner/repo.git" and a button next to it or below it labeled "Clone from URL" or "Add repo". The overall layout is vertical: headline, subtext, dropzone, then URL input and button. Nothing else clutters the page; the rest is empty or very light background so the focus is on adding a repo. If the user is not signed in, the same page might still show the dropzone and URL input; the navbar Sign in is the only auth entry point on this page. No sidebar; only the top nav. Use realistic example text only, no lorem ipsum.

---

PAGE 2: Dashboard (/dashboard)

The same top navbar appears: CodeViz on the left, and on the right links such as Dashboard (emphasized or active to show we are on this page), the user's name or avatar, and possibly Sign out. The page title below the navbar is something like "Your repositories" or "Dashboard".

The main content is a grid or list of cards. Each card represents one saved repository. A card shows the repository name as the main title (e.g. "visualize-code", "nextjs-app", "api-gateway"). Below the name, secondary information: file count (e.g. "127 files"), source type ("Uploaded" or "Cloned from GitHub"), and last viewed date (e.g. "Viewed 2 hours ago" or "Last viewed Jan 15"). Each card is clickable or has a clear "Open" or "View graph" action; some cards may show a delete or trash icon for removing the repo. Cards are laid out in a responsive grid with consistent spacing; two or three columns on a typical desktop, with a premium amount of padding inside each card and between cards. Above the cards there may be a short line of text like "Repos you've added or cloned" or "Recently viewed" if the list is ordered by last_viewed_at.

If the user has no repos yet, show an empty state: the same navbar and page title, then a centered message such as "No repositories yet" with a short line like "Add your first repo from the home page" and a button or link that goes back to the landing page. No tables; only cards. Use real-looking repo names and dates.

---

PAGE 3: Graph visualisation (/repo/[repoId])

This page shows the dependency graph for one repository. The same top navbar is present: CodeViz on the left, Dashboard and user/avatar on the right. Optionally the navbar or an area just below it shows the current repo name (e.g. "visualize-code") so the user knows which repo they are viewing.

The main area is a large canvas that fills most of the viewport below the nav. On this canvas, nodes represent files. Each node displays a short label: the filename or path segment (e.g. "page.tsx", "utils/parser.ts", "DependencyGraph.tsx"). Nodes may be small rectangles or rounded pills with a subtle border and background; the selected node is visually distinct (e.g. stronger border or accent background). Edges connect nodes and indicate import direction (e.g. from "page.tsx" to "DependencyGraph.tsx"); edges can be simple lines, and optionally one style for "animated" or default. The graph supports pan and zoom so the user can move around; the canvas may have a light grid or dot pattern in the background. There may be small controls in a corner for zoom in, zoom out, or fit view.

When the user clicks a file node, a slide-in panel opens from the right side of the screen. The panel overlays or sits beside the graph and has a fixed or max width (e.g. one-third of the viewport). The panel header shows the file path (e.g. "app/repo/[repoId]/page.tsx") and possibly a close button. The body of the panel shows the AI-generated explanation as readable text (or markdown-rendered content); example content could be "This file is the main page for viewing a repo's dependency graph. It loads the graph data and renders the canvas and the explanation panel." When no node is selected, the panel is closed or hidden; when a node is selected, the panel is open. The panel has a light background and subtle shadow or border so it clearly sits above or beside the canvas. Use real-looking file paths and a short sample explanation, no lorem ipsum.

If the repo has no files or the graph is empty, show a message in the canvas area such as "No files in this repository" or "No dependencies parsed." Hover states: nodes could have a slight highlight on hover; the selected node stays clearly indicated.

---

PAGE 4: OAuth sign-in (/(auth)/login or /login)

This page is focused only on signing in. The same top navbar may appear (CodeViz on the left, Sign in perhaps de-emphasized or absent since we are on the login page). The main content is centered vertically and horizontally.

A heading such as "Sign in to CodeViz" or "Welcome back" sits at the top. Below it, two primary buttons: one for "Sign in with GitHub" and one for "Sign in with Google". Each button shows the provider name and typically the provider logo; buttons are full-width or fixed width, same size, stacked vertically with space between them. There may be a short line of text under the buttons like "We use OAuth to keep your account secure." No username/password fields; only the two OAuth buttons. The rest of the page is minimal: light background, no extra cards unless a single card wraps the heading and buttons for clarity. Use the same light theme and accent as the rest of the app.

---

GLOBAL DESIGN NOTES

Theme and colors: Light theme only. Background is white or very light gray. Use a soft slate or blue as the primary accent for buttons, links, and selected states (e.g. a blue in the #3b82f6 or slate-600 range). Borders and dividers are light gray; avoid heavy shadows.

Typography: Clean, readable sans-serif (e.g. Inter or system-ui). Use a clear hierarchy: one dominant headline per section, then body and secondary text. File names and paths can use a slightly monospace or medium weight for clarity. No serif or decorative fonts.

Cards and containers: Cards have a light border, subtle shadow or none, and rounded corners (e.g. 8px). Inner padding is generous. Use the same card style for repo cards on the dashboard and for any wrapped content on the login page.

Buttons and interactive elements: Primary buttons use the accent color; secondary actions use outline or ghost style. Buttons have consistent padding and border radius. Links in the nav use the same visual language. Hover and focus states are visible but subtle.

Spacing and whitespace: Premium, spacious feel. Avoid dense packing. Use consistent vertical rhythm between sections and between cards. The landing page and login page have a lot of empty space so the main action is obvious.

Responsive behavior: Layout works on desktop and tablet; the top nav may collapse to a menu on small screens. The graph page canvas fills available space; the slide-in panel may become full-width on narrow viewports. Card grid on dashboard reduces to one or two columns on smaller screens.

Recurring patterns: The top navbar is the only navigation; it appears on every page with CodeViz on the left and contextual links (Dashboard, Sign in / user) on the right. All pages share the same light theme, accent, and card/button style. The slide-in panel on the graph page is the only large overlay pattern; no modals for explanations.
