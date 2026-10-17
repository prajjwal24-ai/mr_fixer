# Mr. Fixer — Mini PRD

## 1. Product
Mr. Fixer is a developer tool that audits a webpage and explains what is wrong, why it matters, and how to fix it.

## 2. Target User
Frontend developers, students, and designers who want practical feedback on a website.

## 3. MVP Goal
Given a public webpage URL, scan one page and produce an evidence-backed report of detectable UI/accessibility issues plus actionable suggestions.

## 4. Core User Flow
1. User enters a webpage URL.
2. User starts the audit.
3. The app loads the page and runs automated checks.
4. The report lists each issue with severity, evidence, explanation, and a suggested fix.
5. User can open the relevant element/context where possible.
6. User fixes the page and runs the audit again to check whether issues remain.

## 5. MVP Features
- URL input with basic URL validation and clear errors.
- Audit a single public webpage per run.
- Detect a focused set of objective issues:
  - Missing accessible names/labels on buttons and form controls.
  - Images missing useful alt text (flag for review where intent is ambiguous).
  - Low text/background contrast where reliably measurable.
  - Horizontal overflow at a mobile viewport.
  - Basic heading-structure problems.
- Group issues by Critical/High/Medium/Low severity, using documented rules.
- For each issue show:
  - Issue title and category.
  - Severity.
  - Evidence: selector/element, short description, and screenshot or highlighted context where feasible.
  - Why it matters.
  - Suggested fix with a small HTML/CSS example when appropriate.
  - Confidence or “needs human review” note when uncertain.
- Re-scan button to verify whether detected issues are resolved.
- Report summary with counts by severity.
- Save/copy or export the report as JSON or Markdown if straightforward.

## 6. AI's Role
Use deterministic tools/rules for objective checks whenever possible. An LLM may explain findings in plain language and propose fixes based on the detected evidence. AI must not invent issues or claim a fix is verified unless a re-scan confirms it.

## 7. Non-Goals for MVP
- Do not automatically edit or deploy the user's website.
- Do not scan entire websites or authenticated/private pages.
- Do not claim to fully judge aesthetics, UX quality, SEO, performance, or security.
- Do not train a custom model.
- Do not add accounts, payments, teams, or a complex dashboard yet.

## 8. Suggested Technical Direction
Choose the simplest stack that fits the existing repository; inspect the repo before making changes. A practical option is:
- Frontend: React + TypeScript.
- Backend: Python FastAPI.
- Browser inspection: Playwright.
- Objective accessibility checks: axe-core where integration is practical.
- Optional LLM API for explanations and fix suggestions.
- Store no user data unless needed for the MVP.

Do not commit to this stack blindly. First inspect the existing project and explain the proposed structure before implementing.

## 9. Acceptance Criteria
- A valid public URL starts a scan and produces a report.
- Invalid URLs and pages that cannot load show understandable errors.
- Every reported issue includes evidence and a suggested next step.
- Objective checks do not depend on an LLM being available.
- AI-generated suggestions are clearly separated from measured findings.
- User can re-scan and see which issues remain.
- The app does not falsely claim that an issue is fixed without verification.

## 10. Build Instructions for Antigravity
Work incrementally and preserve existing code.
1. Inspect the current repository and report its structure, stack, and existing patterns.
2. Propose a minimal implementation plan and identify dependencies.
3. Implement the smallest working end-to-end slice first: URL input → page scan → issue report.
4. Run the app and tests; fix errors before adding polish.
5. Add AI explanations only after objective detection works.
6. Do not rewrite unrelated files, invent existing architecture, or add features outside this PRD without asking.
7. Keep code readable and document how to run the project.

## 11. Success Measure
On a small, manually checked set of test pages, compare the tool's findings with human-verified findings. Track true issues found, false positives, and whether re-scan correctly identifies resolved issues.
