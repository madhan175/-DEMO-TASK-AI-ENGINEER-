# AI App Compiler — Architecture & Design Rationale

> **This document is a deep-dive into the "why" behind every major design decision in the AI App Compiler.** It is intended for engineers, architects, product owners, and business leaders who want to understand not just what the system does, but why it was built the way it was.

---

## Table of Contents

1. [The Problem](#the-problem)
2. [Why Not Just "Prompt → Output"?](#why-not-just-prompt--output)
3. [The Compiler Metaphor](#the-compiler-metaphor)
4. [System Architecture Overview](#system-architecture-overview)
5. [Stage-by-Stage Rationale](#stage-by-stage-rationale)
6. [Technology Decisions](#technology-decisions)
7. [API & Schema Design](#api--schema-design)
8. [Validation & Repair Engine](#validation--repair-engine)
9. [Runtime Execution Layer](#runtime-execution-layer)
10. [Frontend Architecture](#frontend-architecture)
11. [LLM Provider Strategy](#llm-provider-strategy)
12. [Business Perspective](#business-perspective)
13. [Scalability & Maintainability](#scalability--maintainability)
14. [Cost Efficiency](#cost-efficiency)
15. [Known Trade-offs](#known-trade-offs)

---

## The Problem

Building software is fundamentally a translation problem. A human has a business intent — "I want a CRM for sales tracking with role-based access" — and that intent must be translated into:

- A **data model** (tables, columns, relationships)
- An **API contract** (endpoints, request/response shapes)
- A **UI layout** (pages, components, navigation)
- **Authentication rules** (who can access what)
- **Business logic** (triggers, validations, computed fields)

Today, developers do this translation manually. It takes weeks, requires deep expertise across multiple domains, and the output is fragile — a change in the data model ripples through the API, UI, and auth layers with no automated consistency check.

The AI App Compiler solves this by formalizing the translation into a **structured, validated, multi-stage pipeline**.

---

## Why Not Just "Prompt → Output"?

The naive approach to this problem is:

```
User Prompt → LLM → Application Code
```

This fails for several critical reasons:

### 1. LLMs are Non-Deterministic
Given the same prompt twice, a model may return two structurally different JSON schemas. A `User` table might have a `user_id` column in one run and `id` in another. Any downstream API or UI that depends on this column name will silently break.

### 2. No Cross-Layer Consistency
A simple prompt-to-output system cannot guarantee that:
- Every API endpoint references a real database table
- Every UI form has a corresponding API endpoint to submit to
- The auth matrix covers all the roles mentioned in the requirements
- Business rules reference only valid fields from the database

### 3. No Recovery From Errors
If the LLM generates a malformed JSON or a logically inconsistent schema, a simple system just fails. There is no mechanism to detect the error and correct it.

### 4. Black Box Opacity
When the output is wrong, you have no visibility into *where* it went wrong. Was it the database generation? The API mapping? The business rules? Without stages, debugging is a full regeneration.

**Our compiler pipeline solves all four of these problems.**

---

## The Compiler Metaphor

A traditional software compiler (like GCC or the TypeScript compiler) works in stages:

```
Source Code → Lexing → Parsing → Semantic Analysis → Optimization → Code Generation → Binary
```

Each stage has a well-defined input, a well-defined output, and explicit error handling. If semantic analysis finds a type mismatch, it stops and reports the error. It does not guess or proceed.

Our AI App Compiler follows this same philosophy:

```
Natural Language → Intent Extraction → System Design → DB → API → UI → Auth → Rules → Validation → Repair → Execution
```

Each stage:
- Receives a **well-defined input** (either the user prompt or the output of the previous stage)
- Produces a **Pydantic-validated, typed output**
- Updates a **real-time status tracker**
- Can trigger the **repair engine** if it fails

This transforms a black-box AI call into a transparent, auditable engineering pipeline.

---

## System Architecture Overview

```
                    ┌─────────────────────────────────────────────┐
                    │              FRONTEND (Next.js)              │
                    │  Dashboard → Prompt → Real-time Status UI   │
                    └───────────────────┬─────────────────────────┘
                                        │ HTTP (REST)
                    ┌───────────────────▼─────────────────────────┐
                    │           BACKEND (FastAPI)                  │
                    │                                             │
                    │  POST /generate  ─►  GenerationService      │
                    │  GET  /status    ◄─  PipelineStatus         │
                    │  GET  /project   ◄─  AppConfig (JSON)       │
                    └───────────────────┬─────────────────────────┘
                                        │
                    ┌───────────────────▼─────────────────────────┐
                    │            COMPILER PIPELINE                 │
                    │                                             │
                    │  [0] Intent Extraction                      │
                    │  [1] System Design (Architecture)           │
                    │  [2] Database Schema Generation             │
                    │  [3] API Endpoint Generation                │
                    │  [4] UI Architecture Generation             │
                    │  [5] Auth Model Generation                  │
                    │  [6] Business Rules Generation              │
                    │  [7] Validation Engine                      │
                    │  [8] Repair Engine (LLM-assisted)           │
                    │  [9] Runtime Execution Simulator            │
                    └───────────────────┬─────────────────────────┘
                                        │
                    ┌───────────────────▼─────────────────────────┐
                    │             LLM PROVIDER LAYER              │
                    │                                             │
                    │  GeminiProvider  ──►  google-genai SDK      │
                    │  OllamaProvider  ──►  Local Ollama Server   │
                    │                                             │
                    │  Fallback Strategy:                         │
                    │   1. Try structured JSON output             │
                    │   2. Try schema-cleaned structured output   │
                    │   3. Fall back to plain-text JSON prompt    │
                    └─────────────────────────────────────────────┘
```

---

## Stage-by-Stage Rationale

### Stage 0: Intent Extraction

**Why it exists:** Raw natural language is ambiguous. "Build a CRM" could mean a single-user notes app or a 50-person sales tool with integrations. Before generating anything structural, we extract the *core intent*, *key entities*, and *explicit assumptions* made to fill gaps in the prompt.

**Output:** `{ project_name, intent, assumptions[] }`

**Design decision:** By surfacing assumptions explicitly, we give the system (and the user) a way to understand *what choices were made* when the prompt was incomplete. This is critical for enterprise adoption where requirements traceability is mandatory.

---

### Stage 1: System Design (Architecture)

**Why it exists:** Architecture is the foundation. Every downstream stage (DB, API, UI, Auth) derives from the architectural entities and system flow. Generating a database schema *before* defining the system architecture leads to schemas that don't reflect the actual business domain.

**Output:** `ArchitectureSchema { entities[], description, tech_stack[] }`

**Design decision:** We generate the architecture before the DB deliberately. The DB is a *consequence* of the architecture, not its starting point.

---

### Stage 2: Database Schema Generation

**Why it exists:** The data model is the contract for everything else. APIs expose data. UIs display and mutate data. Auth controls access to data. A well-structured DB schema ensures all downstream stages share a single source of truth.

**Output:** `DBSchema { tables[{ name, columns[], relationships[] }] }`

**Design decision:** We use SQLite semantics for the schema (TEXT, INTEGER, REAL, BLOB) because it is the most portable and testable format. The schema is immediately executable for verification in Stage 9.

---

### Stage 3: API Endpoint Generation

**Why it exists:** Without an explicit API contract, the UI has no structured way to interact with the backend, and auth has no resources to protect. The API layer is generated from the architecture and cross-referenced against the DB to ensure every endpoint references real tables/columns.

**Output:** `APISchema { endpoints[{ method, path, description, request_body, response_schema }] }`

**Design decision:** RESTful conventions are enforced because they are universally understood, easy to validate for consistency (e.g., a GET endpoint should not have a request body that mutates state), and map directly to FastAPI route definitions.

---

### Stage 4: UI Architecture Generation

**Why it exists:** A UI defined independently of its API endpoints becomes disconnected. Forms that submit to non-existent endpoints, tables that display fields not returned by the API — these are common bugs in manually built systems. Our UI stage uses the API output as its direct input, ensuring every component has a real data source.

**Output:** `UISchema { pages[{ route, title, components[] }] }`

**Design decision:** We generate a component-level specification (Tables, Forms, Charts) rather than actual code. This is a deliberate abstraction — it is LLM-model-agnostic and can be rendered by any frontend framework. The specification is the artifact; framework-specific code generation is a separate concern.

---

### Stage 5: Auth Model Generation

**Why it exists:** Auth is typically bolted on last in traditional development. This creates situations where the data model doesn't support auth (no `user_id` foreign key on tables that should be user-scoped). By generating auth *after* the DB and API but treating it as a core pipeline stage, we ensure the auth model is derived from the system's actual resources.

**Output:** `AuthSchema { roles[], permissions[{ role, resource, actions[] }] }`

**Design decision:** We model auth as a permission matrix (who can do what on which resource) rather than code. This is the most portable and auditable representation of auth logic.

---

### Stage 6: Business Rules Generation

**Why it exists:** Business rules are the "if-then" logic that makes an application correct. "An invoice cannot be marked paid if its total is zero." "A user cannot be deleted if they have pending orders." These rules live in the gap between the DB schema and the API, and they are almost universally underdocumented.

**Output:** `RulesSchema { rules[{ name, trigger, condition, action }] }`

**Design decision:** We extract rules from the architecture description rather than the raw user prompt, because the architecture phase disambiguates the business domain. This produces higher-quality, more specific rules.

---

### Stage 7: Validation Engine

**Why it exists:** The 6 generation stages can produce outputs that are individually valid but collectively inconsistent. The Validator is a deterministic, rule-based checker (not an LLM) that enforces cross-layer consistency:
- Do all API endpoints reference tables that exist in the DB?
- Does every auth role have at least one permission?
- Does every UI route have at least one component?

**Design decision:** Validation is **not** LLM-powered. It is a strict, deterministic checker written in Python. This is critical for reliability — an LLM-powered validator would be slow, expensive, and non-deterministic.

---

### Stage 8: Repair Engine

**Why it exists:** When validation fails, we don't want to regenerate everything from scratch. The Repair Engine is an LLM-assisted "surgeon" that receives the specific validation errors and the relevant generated sections, and makes targeted fixes.

**Design decision:** Modular repair (fix only what's broken) is more cost-efficient and produces less "drift" than full regeneration. It is philosophically equivalent to how a human engineer handles a code review — targeted changes, not a full rewrite.

---

### Stage 9: Runtime Execution Simulator

**Why it exists:** A schema that looks correct on paper might fail when executed. The executor actually creates an in-memory SQLite database from the generated schema and verifies that every table can be created without SQL syntax errors or constraint violations. It also simulates endpoint registration.

**Design decision:** Execution-time verification closes the loop. It's the difference between a compiler that produces an executable and one that produces code that *might* compile. This makes the system fundamentally more reliable.

---

## Technology Decisions

### FastAPI (Backend)
- **Native async support** allows the pipeline to run as a background task while the frontend polls for status — critical for a process that can take 30-60 seconds.
- **Automatic OpenAPI docs** give the frontend team a self-documenting API contract.
- **Pydantic integration** means every request and response body is automatically validated.

### Pydantic v2 (Schema Validation)
- **Why Pydantic over plain dicts?** Type safety at runtime. When Stage 2 outputs a `DBSchema`, Python *guarantees* it has a `tables` field that is a list of `Table` objects. No defensive programming needed.
- **Why v2 over v1?** 5-50x faster validation, better JSON schema generation, and first-class support for `model_json_schema()` which is used by the LLM provider layer.

### Next.js 15+ (Frontend)
- **App Router** enables server-side rendering for the dashboard while keeping client-side interactivity for the pipeline monitor.
- **TypeScript** enforces type safety on the API response shapes, preventing the frontend from silently ignoring missing fields.

### google-genai SDK (LLM Integration)
- **Why migrate from `google-generativeai` to `google-genai`?** The new SDK supports the latest `AQ.` prefix API key format used by the Gemini Developer API as of 2025+, and exposes an `aio` namespace for native async support.

### SQLite (Runtime Simulator)
- **Zero infrastructure** — no database server needed for local development or CI/CD.
- **Portable** — the generated schema can be exported and applied to PostgreSQL/MySQL with minimal changes.
- **Instantly verifiable** — Python's built-in `sqlite3` module means no external dependency.

---

## API & Schema Design

The API follows a **fire-and-poll** pattern for long-running generation:

```
POST /generate       → returns { project_id } immediately
GET  /status/:id      → returns real-time PipelineStatus (polled by frontend)
GET  /project/:id     → returns full AppConfig when complete
GET  /analytics       → returns aggregate project statistics
```

**Why fire-and-poll over WebSockets?**
- WebSockets require persistent connections. On serverless or shared hosting environments, this is unreliable.
- Polling at 2-second intervals provides near-real-time feedback with minimal infrastructure complexity.
- The frontend can be stateless — it simply stores the `project_id` and polls until completion.

---

## Validation & Repair Engine

The Validator checks six categories of consistency:

| Check | What it verifies |
|---|---|
| **DB Consistency** | All entities in the architecture have a corresponding DB table |
| **API Consistency** | All API resource paths correspond to a real DB table name |
| **UI Consistency** | Every page route has at least one component |
| **Auth Coverage** | Every role has at least one permission defined |
| **Rules Integrity** | All business rules reference existing entities |
| **Schema Completeness** | No stage produced an empty output |

Each violation is scored. The validation score (0-100%) drives the decision to trigger the Repair Engine.

The **Repair Engine** is invoked only when `is_valid = False`. It sends the specific errors and the relevant sections of the config to the LLM with a targeted repair prompt:

```
"The following validation errors were found in the generated configuration:
[errors]

Please fix ONLY these issues in the relevant sections: [sections]
Return the corrected JSON."
```

This is significantly cheaper than a full regeneration because the LLM only processes the subset of the config that needs fixing.

---

## Runtime Execution Layer

The `RuntimeExecutor` performs two checks:

1. **SQL Execution**: Creates each table in an in-memory SQLite database. If any column type is invalid, a constraint is malformed, or a table name conflicts, the execution fails with a specific error.

2. **Endpoint Registration Count**: Verifies that the number of API endpoints generated is non-zero and logs each one.

This is a **simulation** — it does not spin up a real HTTP server. The value is in catching schema-level SQL errors that would only appear at runtime.

---

## Frontend Architecture

The dashboard is a single-page application that communicates with the backend exclusively via REST. Key design decisions:

- **Real-time Pipeline Visualization**: Each stage is represented as a card with a status indicator (waiting → running → success/failed). This is driven by the polled `/status` endpoint.
- **Tab-based Config Viewer**: Once generation completes, the full `AppConfig` is surfaced in structured tabs (Architecture, DB, API, UI, Auth, JSON). This allows the user to review every layer without being overwhelmed by a single JSON blob.
- **Error Alerts**: If any pipeline stage fails, the frontend extracts the error from the stage's `errors[]` array and displays it in a human-readable alert — eliminating the "spinning forever with no feedback" anti-pattern.

---

## LLM Provider Strategy

The system uses an **abstract provider interface** (`BaseLLMProvider`) that all LLM integrations must implement:

```python
class BaseLLMProvider:
    async def generate_json(self, prompt: str, schema: Any) -> Dict[str, Any]:
        raise NotImplementedError
```

This means:
- **Gemini** and **Ollama** are interchangeable at runtime by simply changing the `model` parameter in the frontend.
- A new provider (OpenAI, Anthropic, Mistral) can be added by creating a new class that implements `generate_json` — no changes to the pipeline are required.
- Testing is trivial — a `MockProvider` can return hardcoded JSON for unit tests without any API calls.

### Schema Compatibility Fallback

Gemini's Developer API does not support `additionalProperties` in JSON schemas (an Enterprise-only feature). The provider implements a three-tier fallback:

```
1. Try: Structured output with cleaned schema (additionalProperties removed)
       ↓ (fails with schema error)
2. Try: Structured output with a raw dict schema (no Pydantic wrapper)
       ↓ (still fails)
3. Try: Plain-text prompt asking for JSON matching the schema structure
```

This ensures the pipeline succeeds regardless of the user's API tier.

---

## Business Perspective

### For a Product Owner

**User Value:** A business analyst with no coding experience can describe an application in plain English and receive a structured, executable specification in 30-60 seconds. The output can be handed to a development team as a starting point, reducing discovery and scaffolding time from days to minutes.

**Reliability:** The validation and repair stages ensure the output is self-consistent. The probability of receiving a fundamentally broken specification is significantly lower than with a raw LLM call.

**Transparency:** Every stage is logged and visible. The pipeline is not a black box — you can see exactly where in the process a failure occurred and why.

### For a Business Leader

**Cost Efficiency:** The system uses targeted LLM calls per stage (typically 6-10 calls per generation at ~1K-3K tokens each) rather than a single massive prompt. This is cheaper, more predictable, and easier to optimize.

**Scalability:** The fire-and-poll API design means the system can handle multiple concurrent generations without blocking. Each generation runs as an independent background task.

**Vendor Independence:** The provider abstraction means the business is not locked into a single LLM vendor. Switching from Gemini to Ollama is a single environment variable change.

### For an Architect

**Separation of Concerns:** Each compiler stage has a single responsibility. The Database Generation stage does not know about UI or Auth. This makes each stage independently testable and replaceable.

**Contract-Driven Design:** Pydantic schemas enforce strict contracts between stages. `AppCompiler.compile()` cannot return malformed data — the type system guarantees it.

**Observability:** The `PipelineStatus` object is a living audit log of the generation process. Every stage records its output and any errors. This data can be stored and used to analyze failure patterns at scale.

---

## Scalability & Maintainability

### Adding a New Stage

1. Define a new Pydantic schema in `schemas/`.
2. Add a new stage to `AppCompiler.compile()` with a well-crafted prompt.
3. Add the stage to the `PipelineStatus` stages list.
4. Update the Validator to check the new stage's output for consistency.

No changes to the frontend, the API, or the repair engine are required.

### Scaling the Backend

The `GenerationService` stores pipeline status in memory (`self.pipeline_statuses`). For a multi-instance deployment:
- Replace the in-memory dict with a **Redis** store for shared state across instances.
- Replace `BackgroundTasks` with a **Celery** or **ARQ** task queue for durable, retryable background jobs.
- The API contract (`/generate`, `/status`, `/project`) remains unchanged.

### Frontend Scaling

The frontend is a stateless Next.js app. It can be deployed to any edge CDN (Vercel, Cloudflare Pages) with zero configuration changes. The only runtime dependency is the `NEXT_PUBLIC_API_BASE_URL` environment variable.

---

## Cost Efficiency

| Strategy | Cost Impact |
|---|---|
| **Staged generation** (vs. one giant prompt) | Lower per-call token count, more predictable billing |
| **Targeted repair** (vs. full regeneration) | Repair uses ~30% of the tokens a full regeneration would |
| **Schema cleaning** (vs. Enterprise tier) | Zero upgrade cost to resolve `additionalProperties` errors |
| **Plain-text fallback** (vs. external orchestration) | No additional infrastructure for error recovery |
| **SQLite simulator** (vs. cloud DB provisioning) | Zero infrastructure cost for execution validation |

---

## Known Trade-offs

| Decision | Trade-off |
|---|---|
| **Fire-and-poll over WebSockets** | Slightly higher latency for status updates; simpler infrastructure |
| **SQLite for simulation** | Full SQL compliance (PostgreSQL features) not tested |
| **In-memory status store** | Pipeline state lost on server restart; acceptable for dev, not for prod |
| **Pydantic models as LLM schemas** | Pydantic v2 schemas include `additionalProperties` by default; mitigated by the recursive cleaner |
| **Plain-text fallback for LLM** | Less structured responses; mitigated by explicit JSON-in-prompt instructions and markdown stripping |
| **Per-request LLM initialization** | Slight overhead; mitigated by Python's object reuse in background tasks |

---

*This document reflects the state of the system as of June 2026. For the latest API reference, see the FastAPI auto-docs at `http://localhost:8000/docs` when the backend is running.*
