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

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0 or newer
- **Java**: JDK 17 (or compatible OpenJDK)

---

### 1. Launch Test Fixture (Target Website)
The repository includes an intentionally defective web application to test Inspectra against:
```powershell
cd test-fixtures
npm start
# Server starts at http://localhost:4000
```

---

### 2. Launch Browser Worker
```powershell
cd worker
npm install   # If not already installed
npm start
# Worker runs at http://localhost:5001
```

---

### 3. Launch Backend Orchestrator
```powershell
cd backend
.\mvnw.cmd spring-boot:run
# Backend runs at http://localhost:8080
```

---

### 4. Launch Frontend Cockpit
```powershell
cd frontend
npm install   # If not already installed
npm run dev
# Vite runs at http://localhost:5173
```

Visit **http://localhost:5173** in your browser. You can click **"Instant 1-Click Demo Login"** to sign in immediately and run an inspection on `http://localhost:4000` or any public website!

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
