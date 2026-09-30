# MASTER AI CODING SPECIFICATION: AI-POWERED CAREER APPLICATION WORKSPACE

## SECTION 1: PRODUCT VISION & QUALITY STATEMENT
This platform is a signature-grade, professional "Job Search Command Center." It is not a simple, static resume builder; it is an intelligent, high-performance workspace inspired by the UX standards of Linear, Figma, Canva, and Notion. 

The core value proposition is to allow users to store a static "Master Profile," ingest any target job advertisement (via PDF, URL, or text), and use DeepSeek AI to dynamically tailor their CV and cover letter to match the role—all while keeping the user in absolute control.

---

## SECTION 2: THE IMMUTABLE DATA ARCHITECTURE (CONSTITUTIONAL RULES)
To prevent data loss and maintain a single source of truth, the database and application state must enforce these rules:

1.  **The Master Profile is Read-Only:** The `MasterProfile` database entity holds the user's core career history. The AI-tailoring pipeline is strictly forbidden from editing, deleting, reordering, or writing to this profile. Only the user can explicitly update it.
2.  **Snapshot Cloning:** When a user tailors their resume for a job, the system must perform a deep copy (clone) of the necessary Master Profile sections into a new `TailoredResume` entity. All subsequent AI-tailoring and manual edits are performed on this clone, preserving the core Master Profile.
3.  **Versioning, Not Overwriting:** Every time a major AI generation or revision occurs, the platform saves it as a new immutable version. Users can compare, duplicate, restore, or export these versions.
4.  **No-Hallucination Guardrail:** The AI must never invent accomplishments, metrics, dates, companies, or credentials. Any details in the generated output that cannot be logically matched back to a seed in the Master Profile must be flagged immediately in the UI.

---

## SECTION 3: CORE TECH STACK REQUIREMENTS
*   **Backend:** Python Django (utilizing Django REST Framework or Django Ninja for structured, type-safe API schemas).
*   **Frontend:** React SPA (TypeScript, TailwindCSS, Shadcn/ui/Radix primitives to guarantee WCAG AA accessibility).
*   **Database:** SQLite (for local development, using clean Django ORM relationships to allow seamless migration to PostgreSQL later).
*   **State Management:** Client-side workspace state must be managed with a lightweight, reactive state engine (like Zustand or React Context) to prevent component re-render lag when typing in the editor.

---

## SECTION 4: THE INTERACTIVE CANVAS WINDOW (FRONTEND WYSIWYG)
The center of the platform is the interactive document sheet, representing a physical page. You must design and build this canvas according to these strict rules:

### 4.1 True-to-Life A4/Letter Sizing
*   The canvas must be rendered as a container with exact A4 (or US Letter) aspect-ratio proportions (e.g., 816px width by 1056px height at standard screen DPI).
*   Implement real-time scale-to-fit resizing. As the browser window scales down (e.g., on laptops or split-screen), the canvas container must use CSS scaling (`transform: scale()`) to shrink smoothly while keeping internal font sizes, margins, and layouts perfectly locked to print proportions.

### 4.2 Inline Document Editing
*   **In-Place Focus:** When a user clicks directly on a bullet point, job title, summary, or section header inside the canvas, that element must immediately transform into an in-place editable field (using `contentEditable` or structured inline textarea inputs).
*   **Visual Style Match:** While editing, the text input field must look identical to the styled template text (same font family, color, font size, weight, line-height, and margins). No blocky modal boxes.
*   **Real-Time Sync:** Every keystroke inside an active canvas block must immediately synchronize with the workspace's React state. 

### 4.3 AI Proposal Overlay & Visual Diffing
*   Any text segment modified or suggested by DeepSeek AI must be visually highlighted (e.g., a subtle dashed border or a soft amber highlight background).
*   Hovering over any highlighted text block must trigger an overlay tooltip with three control options:
    1.  **Accept:** Removes the highlight and saves the AI text as finalized user content.
    2.  **Undo/Reject:** Instantly reverts the text to its pre-AI state.
    3.  **Rephrase with AI:** Opens an inline input box asking the AI to tweak the phrasing (e.g., "make it punchier," "emphasize leadership").

### 4.4 Dynamic Page-Break Monitoring
*   The canvas layout engine must actively calculate the cumulative vertical height of all DOM elements.
*   If the height exceeds the single-page boundary limit, render a clean, dashed horizontal divider line with a tag: `--- Page Break Limit (Page 1 of 2) ---`.
*   Prevent page-break cutting. If a paragraph or work-experience block straddles this boundary, apply print CSS properties (`page-break-inside: avoid`) to prevent awkward truncation of sentences across page exports.

---

## SECTION 5: DATABASE LOGICAL SCHEMAS (DJANGO)
Construct your Django database layer with these relational entities:

1.  **User Model (Django Auth):** Handles user credentials.
2.  **MasterProfile Model:**
    *   Linked One-to-One with the User.
    *   Stores personal info, professional summary, education array, skills array, and experience blocks (each with unique IDs, company, title, dates, and baseline bullet points).
3.  **JobApplication Model:**
    *   Linked Foreign Key to User.
    *   Tracks target job metrics: Company name, job title, salary estimation, job URL, application status (Wishlist, Applied, Interviewing, Offer, Rejected), and the raw, unedited job description text.
4.  **TailoredResume Model:**
    *   Linked One-to-One with a Job Application.
    *   Stores the customized, edited clone of the resume data (tailored summary, modified experiences, subset skills list).
    *   Tracks metadata: chosen layout template, selected color scheme, ATS optimization match score (0-100), and AI-highlight flags.
5.  **CoverLetter Model:**
    *   Linked One-to-One with a Job Application.
    *   Stores the AI-generated text body, target tone parameters, and revision history.

---

## SECTION 6: THE DEEPSEEK AI MULTI-AGENT PIPELINE
Do not write one monolithic prompt. The backend should orchestrate the tailoring process using an organized pipeline of specialized agents:

### 6.1 Agent 1: The Job Ad Parser
*   **Input:** Raw job description text scraped or pasted by the user.
*   **Task:** Clean the raw text, filter out system garbage, and structure the data.
*   **Output Structure:** Return a clean JSON containing: target company name, title, primary hard skills, secondary soft skills, core job duties, and corporate culture tone (e.g., Startup, Enterprise, Academic).

### 6.2 Agent 2: The Resume Tailor & Synthesizer
*   **Input:** Master Profile JSON + Parsed Job Ad JSON.
*   **Task:** Optimize the summary and experience bullet points to match the target job description. Focus the narrative on the candidate's achievements that utilize the required skills.
*   **Output Structure:** Return a JSON payload containing the rewritten summary and revised work experience bullets mapped back to their original Master Profile block IDs.
*   **Constraint Rule:** The agent must only use technologies and facts already present inside the Master Profile.

### 6.3 Agent 3: The Cover Letter Creator
*   **Input:** Master Profile JSON + Parsed Job Ad JSON + Selected Tone Profile.
*   **Task:** Compose a personalized, highly compelling cover letter.
*   **Constraint Rule:** Restrict length to 300-400 words, follow standard layout formatting, reference the specific company and role, and do not make up background stories.

### 6.4 Agent 4: The Hallucination Validator (Deterministic Shield)
*   **Input:** Original Master Profile JSON + AI-Generated Tailored Resume.
*   **Task:** Run a deterministic backend validation check. Scan all sentences for uppercase technology frameworks (e.g., "Kubernetes", "GraphQL") and numerical values (e.g., "40%", "$50k"). 
*   **Action:** If a metric or keyword appears in the tailored resume that has zero semantic ancestry or literal mention in the Master Profile, write an API alert flag: `severity: "WARNING", message: "This detail was generated by AI but not verified in your Master Profile. Please check it."`

---

## SECTION 7: THE PRESETS DESIGN TEMPLATE ENGINE
The layout system launches with exactly three high-end structural templates. Users cannot break the design rules of these presets:

1.  **Template 1: Modern Minimalist**
    *   *Grid:* Asymmetric, generous left margins, modern, clean.
    *   *Typography:* High-legibility geometric sans-serif (e.g., Inter, Plus Jakarta Sans).
    *   *Accents:* Thin dividers, muted neutral colors.
2.  **Template 2: Executive Professional**
    *   *Grid:* Traditional, authoritative, symmetrical, centered title block.
    *   *Typography:* Elegant editorial serif faces (e.g., Merriweather, Lora).
    *   *Accents:* Dual borders, corporate deep navies and golds.
3.  **Template 3: Creative Tech**
    *   *Grid:* Two-column sidebar split layout, high information density.
    *   *Typography:* Technical developers monospace/sans mix (e.g., JetBrains Mono, Fira Code).
    *   *Accents:* Bright structural accent borders (e.g., Emerald green highlights).

---

## SECTION 8: THE COMMAND CENTER DASHBOARD (ANALYTICS)
Build a dashboard that gives job seekers an overview of their operations:

*   **KPI Metrics Cards:** Displays key tracking parameters (Total Applications, Average Tailored Match Score, Upcoming Interviews, Conversion Rates).
*   **Visual Kanban Board:** A drag-and-drop workflow board with columns for: `Wishlist`, `Applied`, `Interviewing`, `Offers`.
    *   Moving cards between columns must automatically update the Job Application's status in the Django SQLite database.
    *   Clicking a board card opens the active application details, connecting directly to its specific Tailored CV, Cover Letter, and custom progress notes.

---

## SECTION 9: EXPORT ENGINE RULES
*   Provide pristine PDF downloads of both the Tailored CV and the Cover Letter.
*   The PDF generation system must utilize standard document style standards. 
*   **PDF Splitting Guardrail:** Enforce CSS rule parameters like `page-break-inside: avoid` on the styling components of the resume blocks. This ensures page-breaks never split a single bullet point or isolate a section header from its content on the exported document.

---