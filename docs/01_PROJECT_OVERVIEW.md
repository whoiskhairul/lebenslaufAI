# 00_PROJECT_RULES.md

# AI Tailored Resume Platform - Project Constitution

> **Purpose**
>
> This document is the highest-priority specification for the project. Every AI coding agent, developer, and contributor must follow these rules. If any other document conflicts with this file, this document always takes precedence.

---

# 1. Project Vision

This platform is **not** a simple resume builder.

It is an **AI-powered Career Application Workspace** that helps users maximize their interview opportunities by intelligently tailoring resumes and cover letters while maintaining complete user control.

The platform should feel like a combination of:

* Notion
* Figma
* Linear
* Canva
* Jobscan
* Teal

The experience must be modern, elegant, responsive, fast, and trustworthy.

---

# 2. Core Philosophy

The AI is an **assistant**, never the owner.

The user always has complete control over every generated result.

The AI proposes.

The user approves.

Nothing should ever happen automatically without user visibility.

---

# 3. Master Profile Rules

The Master Profile is the single source of truth.

Rules:

* AI can read the Master Profile.
* AI cannot modify the Master Profile.
* AI cannot delete information from the Master Profile.
* AI cannot reorder Master Profile records.
* Only the user may edit the Master Profile.
* Every tailored resume is generated from the Master Profile.

---

# 4. No Hallucination Policy

The AI must never invent:

* companies
* job titles
* employment dates
* projects
* certificates
* education
* technologies
* achievements
* metrics
* awards
* publications
* responsibilities

If the information is missing:

* ask the user,
* leave it unchanged,
* or mark it as requiring confirmation.

Never fabricate.

---

# 5. Evidence-Based AI

Every AI-generated sentence must originate from evidence inside the Master Profile.

Each generated suggestion should contain:

* confidence score
* evidence source
* explanation

Example:

Evidence:
Experience #2

Reason:
Matches Kubernetes requirement.

Confidence:
95%

---

# 6. User Approval

Every AI modification must be:

* visible
* editable
* reversible
* explainable

The user may:

* accept
* reject
* rewrite
* regenerate
* manually edit

Nothing becomes permanent until approved.

---

# 7. Resume Versioning

Every generated resume becomes a new immutable version.

Never overwrite previous versions.

Each version stores:

* generation date
* target company
* target role
* AI prompt version
* template
* ATS score
* match score

Users can:

* compare versions
* restore versions
* duplicate versions
* export versions

---

# 8. Cover Letter Rules

Every cover letter is generated independently.

Cover letters must:

* reference the target company
* reference the target role
* match the selected tone
* avoid generic wording
* never fabricate experience
* remain editable

---

# 9. AI Explainability

Every important AI suggestion must include:

Why was this changed?

Which requirement triggered it?

Which evidence supports it?

Users should always understand AI reasoning.

---

# 10. Transparency

AI-generated content must be visually distinguishable until approved.

Possible indicators include:

* subtle highlight
* AI badge
* version marker
* diff comparison

Never hide AI changes.

---

# 11. Resume Editing

Users can edit:

* summary
* experience
* projects
* education
* skills
* certifications
* languages
* custom sections

Edits must update only the current resume version.

Never update the Master Profile automatically.

---

# 12. Templates

Launch with exactly three templates.

Modern Minimalist

Executive Professional

Creative Tech

Future templates must integrate through the Template Engine without changing business logic.

Templates control:

* layout
* spacing
* typography
* colors
* visual hierarchy

Users cannot break layout integrity.

---

# 13. Design Philosophy

The interface should prioritize:

clarity

minimalism

consistency

speed

professional appearance

large whitespace

excellent typography

high accessibility

Avoid unnecessary animations.

Animations should enhance usability rather than decorate.

---

# 14. Dashboard Philosophy

The dashboard is the user's Career Command Center.

It should provide immediate insight into:

* applications
* ATS scores
* interview rate
* offer rate
* resume versions
* AI activity
* upcoming follow-ups
* recent jobs
* analytics

The dashboard should prioritize useful information over visual clutter.

---

# 15. AI Workflow

The AI process must follow this order:

1. Parse Job Advertisement

2. Extract structured data

3. Analyze ATS requirements

4. Compare against Master Profile

5. Build recommendation plan

6. Generate tailored resume

7. Validate generated content

8. Detect hallucinations

9. Generate cover letter

10. Produce explanation report

11. Present editable output

Never skip validation.

---

# 16. AI Agent Separation

Each AI task should have one responsibility.

Recommended agents include:

* Job Parser
* Keyword Extractor
* Resume Tailor
* Summary Writer
* Cover Letter Writer
* ATS Analyzer
* Grammar Reviewer
* Hallucination Validator
* Diff Generator
* Quality Reviewer

Avoid one large prompt performing every task.

---

# 17. Security

Personal information is highly sensitive.

Never expose:

emails

phone numbers

addresses

API keys

tokens

passwords

AI prompts containing secrets

Always use secure authentication.

Encrypt sensitive information.

Never log confidential user content.

---

# 18. Privacy

Users own all generated content.

The platform must never use user resumes for model training without explicit consent.

Deleting an account must remove all personal data.

Follow GDPR-friendly principles.

---

# 19. Accessibility

The application must meet WCAG AA standards.

Support:

keyboard navigation

screen readers

focus indicators

high contrast

responsive typography

accessible forms

Never rely solely on color to communicate meaning.

---

# 20. Performance

Target performance:

Initial load:
< 2 seconds

AI generation:
streaming response

Dashboard:
fast navigation

Editor:
real-time updates

PDF export:
efficient generation

Avoid unnecessary re-renders.

---

# 21. Responsive Design

Support:

Desktop

Laptop

Tablet

Mobile

The editing workspace is desktop-first but remains functional on smaller devices.

---

# 22. Coding Principles

Use:

TypeScript

Strict typing

Reusable components

Feature-based architecture

Clean Architecture principles

SOLID principles

Dependency Injection where appropriate

Composition over inheritance

Avoid duplicate logic.

---

# 23. Error Handling

Every feature must provide:

loading state

empty state

error state

retry option

user-friendly error messages

Never expose internal server errors to users.

---

# 24. Audit Trail

Record important events:

AI generations

resume creation

resume edits

exports

cover letter creation

application status changes

template changes

The audit log must never store secrets.

---

# 25. Export Rules

Supported exports:

PDF

DOCX

Markdown

JSON

Exports must preserve:

layout

fonts

spacing

page breaks

icons

visual consistency

---

# 26. Future Scalability

The architecture must support future additions without major refactoring.

Future features may include:

* LinkedIn import
* GitHub integration
* Portfolio integration
* Interview preparation
* AI career coach
* Learning recommendations
* Job board integrations
* Additional templates
* Multiple AI providers
* Team workspaces
* Enterprise features

Design extensible interfaces from the beginning.

---

# 27. Definition of Done

A feature is complete only if it includes:

* business logic
* responsive UI
* accessibility
* validation
* loading state
* empty state
* error state
* documentation
* unit tests where applicable
* integration tests where applicable
* clean code
* type safety
* production readiness

Working code alone is not considered complete.

---

# 28. Non-Negotiable Rules

The AI must never:

* fabricate user information
* overwrite the Master Profile
* hide generated changes
* remove user control
* break template integrity
* ignore accessibility
* duplicate code unnecessarily
* expose sensitive data
* bypass validation
* silently fail

These rules are mandatory throughout the project.

---

# AI Agent Checklist

Before completing any task, verify:

* Does this preserve the Master Profile?
* Is every AI suggestion explainable?
* Can the user edit every generated result?
* Is every AI change reversible?
* Are hallucinations prevented or flagged?
* Does the feature follow the design system?
* Does it work responsively?
* Are loading, error, and empty states implemented?
* Is the code reusable and type-safe?
* Does it align with the overall product vision?

If any answer is **No**, the implementation is not complete.
