# NEXA Scan Result UI Redesign

The current AI result presentation feels like a generated report rather than a modern cybersecurity product.

Problems observed:

- Raw markdown headings (###) are visible.
- Results appear as a large wall of text.
- Important findings are difficult to identify quickly.
- The UI does not match NEXA's friendly and intelligent personality.
- Normal users may feel overwhelmed.
- The report looks AI-generated instead of product-designed.

The goal is to redesign the scan results experience so that it feels:

- Modern
- Professional
- Human-friendly
- Easy to skim
- Educational
- Trustworthy

---

# DESIGN PRINCIPLE

Users should understand the scan outcome within 5 seconds.

The most important information should be visible immediately.

Technical details should be available but hidden behind expandable sections.

---

# REQUIRED RESULT STRUCTURE

After a scan completes, display results in this order:

## 1. Scan Status Card

Display:

- Website scanned
- Scan completion status
- Scan date/time
- Scan duration

Example:

Scan Complete

Target:
example.com

Status:
Completed

Duration:
12 seconds

---

## 2. Security Verdict Card

This should be the first thing users notice.

Examples:

🟢 Appears Safe

🟡 Use Caution

🔴 Potential Risk Detected

Include a short explanation.

Example:

"NEXA did not detect any major security issues during this scan."

or

"NEXA found several issues that should be reviewed."

---

## 3. Risk Overview

Display small summary cards.

Example:

Critical: 0

High: 0

Medium: 1

Low: 2

Informational: 5

Make this highly visual.

---

## 4. NEXA AI Summary

This section should sound human.

Not robotic.

Not academic.

Bad:

"The web application vulnerability scan performed..."

Good:

"Good news. Nothing dangerous stood out during this scan. The website appears healthy based on the checks performed."

Another example:

"NEXA found a few issues worth tightening up, but nothing suggests an immediate security emergency."

The tone should feel like a knowledgeable teammate.

---

## 5. Findings Section

Each finding should be displayed as a separate card.

Example:

⚠ Missing Security Headers

Risk:
Low

Why It Matters:
Some browser protections are missing.

Potential Impact:
Could make certain attacks easier.

Recommended Fix:
Add recommended security headers.

---

Never place all findings in one large paragraph.

---

## 6. Recommendations Section

Display recommendations as action items.

Example:

✓ Update outdated software

✓ Enable HTTPS everywhere

✓ Add Content Security Policy

✓ Restrict unnecessary open ports

---

## 7. Technical Details (Collapsible)

Advanced users can expand this section.

Contents:

- Raw Nuclei findings
- Headers detected
- Technologies detected
- Open ports
- CVEs
- Raw scanner output

Hide this by default.

---

# PERSONALITY REQUIREMENTS

NEXA is not a report generator.

NEXA is a cybersecurity teammate.

The platform should sound:

- Friendly
- Smart
- Helpful
- Calm
- Confident

Never:

- Sound robotic
- Sound overly academic
- Produce huge walls of text

---

# MARKDOWN RENDERING

Never display markdown syntax to users.

The following should render properly:

# Heading

## Heading

### Heading

Lists

Bold text

Tables

If markdown is returned from the AI layer, convert it to proper UI components before display.

Users should never see raw markdown symbols.

---

# USER EXPERIENCE GOAL

A normal internet user should immediately understand:

- Is this website safe?
- Did NEXA find anything dangerous?
- Should action be taken?

A developer should be able to:

- Review findings
- Understand risks
- Access technical details

without cluttering the interface for non-technical users.

The scan result experience should feel closer to a modern SaaS security platform than an AI-generated report.