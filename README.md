# Inspectra: Autonomous AI Website Testing & QA Intelligence Platform

Inspectra is an enterprise-grade autonomous website testing and QA intelligence platform. It simulates real-world user journeys, crawls application routes, evaluates accessibility and responsiveness, detects broken workflows, and provides instant root-cause failure analysis powered by AI and deterministic heuristics.

---

## 🏛️ System Architecture

Inspectra consists of four decoupled, cooperating services:

```
+-------------------------------------------------------------------------+
|                    Frontend (Vite + React 18 + TS)                     |
|  - Tailwind CSS + Lucide Icons + Framer Motion                          |
|  - Real-time SSE Execution Stepper & Live Streaming Terminal            |
|  - Interactive Quality Scorecard & Category Gauges                      |
|  - Deep Findings Explorer & AI Remediation Drawer                       |
|  - One-Click PDF & JSON Report Exports                                  |
+-------------------------------------------------------------------------+
                                    |
                         REST / SSE (Port 8080)
                                    v
+-------------------------------------------------------------------------+
|                  Backend Orchestrator (Spring Boot 3.3.4)               |
|  - Java 17, Spring Security with JWT Authentication                     |
|  - Target URL Security Sandbox & SSRF Guardrails                        |
|  - Asynchronous Test Run Dispatcher & SSE Relaying                      |
|  - Composite Quality Score Calculator (Scoring v1.0)                    |
|  - Failure Diagnostics Service (Ollama Llama 3.2 + Rule Engine)         |
|  - Lowagie OpenPDF & JSON Report Generation Engine                      |
|  - Database: H2 Embedded / PostgreSQL Support                           |
+-------------------------------------------------------------------------+
                   |                                     |
         HTTP / SSE (Port 5001)               REST (Port 11434)
                   v                                     v
+------------------------------------+   +--------------------------------+
| Playwright Worker (Node.js + TS)  |   | Ollama AI Engine (Optional)    |
| - Autonomous Headless Chromium     |   | - Llama 3.2 / Qwen             |
| - axe-core WCAG 2.1 AA Audits      |   | - Fallback: Deterministic Rule |
| - pixelmatch Visual Regression     |   |   Engine if Ollama offline     |
| - Live Event Streaming & Artifacts |   +--------------------------------+
+------------------------------------+
                   |
     Audits Target Website / App
                   v
+------------------------------------+
| Target Website / Test Fixtures     |
| (e.g., http://localhost:4000)      |
+------------------------------------+
```

---

## ✨ Key Capabilities

1. **Autonomous Route Discovery & Crawling**:
   - Discovers internal links, form controls, navigation menus, and page metadata up to a configurable depth.
2. **Multi-Category QA Test Suites**:
   - **Functional**: Validates interactive elements, button clickability, and link validity.
   - **Forms & Inputs**: Exercises field validation, boundary limits, and submit handlers.
   - **Responsive Viewports**: Tests against Desktop (1440x900), Tablet (768x1024), and Mobile (390x844).
   - **Accessibility**: Audits WCAG 2.1 / 2.2 AA rules (color contrast, missing image `alt`, landmark roles, aria attributes) via `axe-core`.
   - **SEO & Metadata**: Inspects heading hierarchies (`h1`–`h6`), title tags, meta descriptions, and canonical tags.
   - **Performance & Web Vitals**: Measures real browser Navigation Timings, Time to First Byte (TTFB), First Contentful Paint (FCP), total page load, and render-blocking resources.
   - **Security & Transport Baseline**: Safe non-destructive auditing of HTTPS transport, OWASP security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy), cookie flags (`Secure`, `HttpOnly`, `SameSite`), and mixed content.
   - **Console & Network**: Captures uncaught JavaScript runtime exceptions, 404s, 500s, and failed network calls.
3. **Autonomous Project Scheduling & Health Trends**:
   - Schedule recurring audits (Hourly, Daily, Weekly, or Custom 5-field Cron) with next run execution.
   - Track longitudinal quality scores and defect counts over time with interactive Recharts trend timelines.
4. **Actionable Remediation & Verification Lifecycle**:
   - Every finding provides reproducible steps, actual vs expected outcomes, technical explanation, and verification procedures.
   - Manage remediation status through an interactive lifecycle: `OPEN`, `IN_PROGRESS`, `FIXED`, `ACCEPTED`, or `FALSE_POSITIVE`.
5. **Transparent Quality Scoring (v1.0)**:
   - Calculates a 0–100 composite score with letter grades:
     - **A**: 90–100 (Excellent)
     - **B**: 80–89 (Good)
     - **C**: 70–79 (Fair)
     - **D**: 60–69 (Needs Work)
     - **F**: <60 (Critical Issues)
   - Explainable penalty deduction based on severity (Critical -15, High -8, Medium -3, Low -1).
6. **AI-Powered Diagnostics & Remediation**:
   - Queries Ollama (Llama 3.2) to analyze stack traces and DOM context.
   - Built-in deterministic rule engine ensures 100% functionality even when Ollama is offline.
7. **Real-time Live Execution Cockpit**:
   - Live SSE event streaming with sub-second terminal log updates and step progression stepper.
8. **Multi-Format Professional Report Export**:
   - One-click downloadable Markdown (`report.md`), PDF report (`report.pdf`), and structured JSON (`report.json`).

---

## 🚀 One-Command Full Stack Startup

You can start the entire Inspectra platform—including the frontend, backend orchestrator, Playwright browser worker, database, and target test fixtures—using a single command from the project root.

### Prerequisites
- **Node.js**: v18.0 or newer (v20+ recommended)
- **Java**: JDK 17 (or compatible OpenJDK)

---

### Primary Startup Command (Cross-Platform / Windows 11)

From the project root:

```bash
npm run dev
```

Or using Windows PowerShell:

```powershell
.\start.ps1
```

#### What Happens Automatically:
1. Validates system runtimes (Node.js 18+, Java 17+).
2. Initializes `.env` from `.env.example` if not already present.
3. Automatically frees any stale processes on ports `4000`, `5001`, `8080`, and `5173`.
4. Concurrently launches all 4 decoupled services with color-coded live logs.
5. Polls HTTP health endpoints until all services are healthy and responsive.
6. Verifies inter-service integration (Backend ↔ Worker, Backend ↔ Database, Frontend ↔ Backend Proxy).
7. Prints a unified status banner with direct links.

Once started, visit **http://localhost:5173** and click **"Instant 1-Click Demo Login"** (or use `demo@inspectra.local` / `inspectra123`).

---

## 🛠️ Root Developer Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Starts all 4 services natively with health verification & live logs. |
| `npm run dev:build` | Recompiles worker TypeScript and Spring Boot backend jar, then starts. |
| `npm run stop` | Gracefully terminates all background services and frees ports. |
| `npm run restart` | Safely stops running services and boots up a fresh session. |
| `npm run logs` | Displays service health status and prints the last 50 log entries. |
| `npm run logs -- -f` | Streams unified live logs from `.inspectra.log`. |
| `npm run test` | Runs the full automated end-to-end integration test suite. |
| `npm run clean` | Safely purges build artifacts (`target/`, `dist/`) without touching database data or reports. |
| `.\start.ps1` | Windows PowerShell alias for `npm run dev`. |
| `.\stop.ps1` | Windows PowerShell alias for `npm run stop`. |

---

## 🔒 Security Sandboxing & SSRF Mitigation

Inspectra strictly enforces URL safety guidelines:
- Non-HTTP protocols (`file://`, `ftp://`, `gopher://`) are permanently rejected.
- Cloud provider link-local metadata addresses (`169.254.169.254`) are blocked.
- Testing against `localhost` and private IP addresses is protected by the **"Allow Local / Private Targets"** toggle.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Framer Motion, Recharts, Canvas-Confetti |
| **Backend** | Spring Boot 3.3.4, Java 17, Spring Security (JWT), Spring Data JPA, WebFlux, Lowagie OpenPDF |
| **Worker** | Node.js, Playwright Chromium, axe-core, pixelmatch, express, SSE |
| **Diagnostics** | Ollama (Llama 3.2) + Deterministic Fallback Rule Engine |
