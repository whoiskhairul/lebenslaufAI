ROLE AND TASK:
You are an Elite Software Architect, Senior UI/UX Engineer, and Expert Typesetter. Your objective is to scaffold and implement a state-of-the-art, pixel-perfect, highly responsive Interactive CV Editor. 


You must build the entire system based on the rigorous technical specifications, feature matrices, and layout principles defined below.

---

1. ARCHITECTURAL CORE: ENGINE-DRIVEN PAGINATION (SOLVING THE DESYNC BUG)

The root cause of print desync is the fluidity of web text vs. the rigidity of physical pages. To eliminate this issue entirely, the system must follow a "Virtual Page Matrix" architecture.

A. The Page Box Constraint
- The frontend canvas must not render the CV as a single continuous document wrapper. It must instead render an array of distinct, isolated, fixed-dimension container elements.
- Each page container element must represent strict physical dimensions matching international standards (exactly 210mm by 297mm for A4, or 8.5in by 11in for US Letter).
- The parent workspace must scale this container smoothly using native CSS transformation scaling rules so it conforms to the user's screen size without altering internal typography, line-heights, margins, or relative positioning.

B. The Multi-Page Overflow Allocation Algorithm
- Implement a client-side Virtual Layout Engine. As the user edits text, adds entries, or changes fonts, the system must compute the height of the elements in real-time.
- If the height of the content within the current page container exceeds the designated printable boundary (minus the top and bottom safety padding tokens), the system must immediately partition the data array.
- The overflowing structural block must be pushed out of the current page container and instantiated at the top of a newly appended page container.
- To prevent a single experience block or bullet point from being sliced horizontally down the middle across pages, the system must enforce layout break rules preventing internal splitting. If an experience card sits on the threshold, the entire card must move to the next page container cleanly.

C. Explicit Print Environment Neutralization
- The global print styles must strip away all default browser-injected information (such as dates, URLs, and page counters) by completely zeroing out standard page headers and footers.
- The print system must mask all elements on the application screen except for the active array of fixed-dimension page containers.
- The containers must be typeset at 100% scale in absolute positioning alignment, ensuring that what the user saw on the live canvas editor matches the exported layout precisely.

---

2. INTERACTIVE CANVAS INTERACTION DESIGN (THE HIGH-CUSTOMIZATION EDITOR)

The workspace canvas must be tactile and interactive, providing immediate feedback with every cursor movement or click.

A. Click-To-Focus Inline Text Management
- Every text node, bullet point, subheading, and field on the canvas must be natively interactive. Clicking on text must seamlessly convert it into an on-canvas editable element without shifting nearby layouts or opening disruptive modal overlays.
- The active editable field must inherit the exact typography configuration (font weight, color, font-family, line-height, and sizing) of the surrounding text style.
- Every character change must instantly update the synchronized frontend state layer, which immediately recalculates structural page heights and checks for text overflows.

B. Dynamic Structural List Mutation
- Hovering over any grouped content segment (such as an individual job description, a single project, or a list of certifications) must uncover subtle utility actions:
  * An "Add Entry" button to instantly spawn a clean, pre-formatted structural item directly below the current item.
  * A "Delete Entry" button to instantly remove the element from the live variant state and shrink the layout height dynamically.
- Bullet points inside experiences must support quick list operations: pressing the Enter key on a bullet point must automatically generate a new empty bullet point beneath it. Pressing Backspace on an empty bullet point must safely clear it and restore focus to the previous item.

C. Structural Section Reordering Matrix
- The master structural layout layout remains rigid, but major content categories (such as Work Experience, Tech Projects, Education, Certifications, and Custom Sections) must behave like discrete modules.
- Each major section header must feature interactive control triggers. Users can click up/down navigation buttons or use a safe grip handle to reorder sections.
- When a section moves, the state data array reorders its indices, and the Virtual Layout Engine recomputes the content boundaries across the page container array to ensure layout integrity.

---

3. COMPREHENSIVE COMPONENT FEATURE MATRIX

Your implementation must fully support the absolute limit of modern professional resume design tools. You must provide functional interfaces for:



A. Custom Structural Fields
- The user must have the capability to create completely custom sections. The application must prompt them for a Section Title and allow them to choose the layout grid format (either a multi-bullet text block or a structured key-value descriptive pair block).

B. Micro-Customization Layout Controls
- Margins and Padding Tuning: Global sliders or toggle controls allowing users to expand or compress the document's top, bottom, and side paddings within safe typographic ranges to fit their copy perfectly onto exact page caps.
- Dynamic Date Formatting: A configuration switch that instantly toggles date displays across the document (e.g., switching between "MM/YYYY", "MMM YYYY", or "YYYY").
- Block Visibility Controllers: An option to hide specific subsections without deleting them entirely from the application state, allowing users to trim descriptions dynamically.

