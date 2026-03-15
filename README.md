# InterviewIQ — AI-Powered Enterprise Interview Simulation Platform

> Built for **Hack & Forge 2026** — Problem Statement 2: Web-Based Intelligent Selector–Applicant Simulation Platform for Enterprise Recruitment

---

## What is HireHub?

HireHub is an intelligent, fully automated interview simulation platform that conducts structured enterprise interviews, adapts questions in real time based on candidate performance, and generates objective suitability reports — without any human interviewer involvement.

The system uses a multi-agent AI pipeline grounded in company documents via RAG (Retrieval-Augmented Generation), ensuring every question asked and every answer scored is traceable back to real organisational knowledge rather than generic AI output.

---

## Problem It Solves

| Problem | How InterviewIQ addresses it |
|---|---|
| Interviewer bias | Fully automated scoring — no human subjectivity |
| Inconsistent questions | AI generates role-specific questions from the same JD every time |
| No objectivity | Every answer scored on 4 dimensions against company documents |
| Slow hiring pipeline | Instant suitability report generated at session end |

---

## Live Demo

**Repo:** [https://github.com/SwarnabhG07/Project-Rejection](https://github.com/SwarnabhG07/Project-Rejection)

---

## Features

### Done
- Candidate landing page and dashboard
- Resume upload with PDF text extraction
- Proctored examination session — webcam active, fullscreen enforced, tab-switch detection
- Real-time speech-to-text answer capture using Web Speech API
- AI-based adaptive questioning — questions generated from company documents
- Answer scoring system — Accuracy, Depth, Clarity, Relevance (0–10 each)
- Suitability report generation at session end

### Planned
- Multi-language interview support
- Video proctoring with facial recognition and gaze tracking
- ATS (Applicant Tracking System) integration
- Interviewer dashboard with session replay
- Industry-specific question libraries (engineering, finance, operations)
- Real-time interviewer coaching panel

---

## Architecture

### Multi-Agent Pipeline

```
Inputs: Interview Guidelines + Company Documents + Candidate Resume
            |
        Agent 1 — Topic Extractor
        Compares resume against company docs via semantic search.
        Extracts 8–12 relevant topics, scores by relevance,
        assigns phase (intro / technical / managerial).
            |
        Agent 2 — Session Orchestrator
        Controls interview lifecycle and phase progression.
        Decides follow-up vs next topic based on scores.
            |
        Agent 3 — Question Framer
        Retrieves top-k document chunks via RAG.
        Frames specific, document-grounded questions.
            |
        Candidate answers (speech-to-text)
            |
        Agent 4 — Evaluator
        Scores answer against retrieved chunks on 4 dimensions.
        Writes to session scores file.
            |
        Agent 5 — Remediation Advisor
        Monitors scores. Flags weak topics back to Agent 1.
            |
        Agent 6 — Report Generator
        Aggregates scores. Generates Hire / Hold / Reject report.
```

### Shared Session State

All agents communicate through a shared Redis session state object — no direct inter-agent context passing. This makes each agent independently scalable.

### RAG Pipeline

```
Company Documents
      |
  Chunking (256–512 tokens, 50-token overlap)
      |
  Embedding Model (sentence-transformers)
      |
  Vector Store (FAISS → Pinecone in production)
      |
  Query at inference time → Top-k chunks retrieved
      |
  Chunks passed to Agent 3 (question framing) and Agent 4 (evaluation)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript, Web Speech API |
| Backend API | FastAPI, Python |
| Authentication | FastAPI sessions |
| PDF Processing | pdfplumber |
| AI / LLM | OpenAI / Claude API via LangChain |
| NLP Evaluation | sentence-transformers, spaCy |
| Vector Store | FAISS (prototype), Pinecone (production) |
| Agent Orchestration | LangChain / LangGraph |
| Session State | Redis |
| Database | SQLite (prototype), PostgreSQL (production) |
| Deployment | Uvicorn, Docker |

---

## Project Structure

```
Project-Rejection/
├── app.py                  # FastAPI application — all routes
├── static/
│   ├── style.css           # Main dashboard styles
│   ├── styleexam.css       # Exam page styles
│   └── js/
│       ├── script.js       # Dashboard JS — upload, skills, webcam
│       └── scriptexam.js   # Exam JS — speech-to-text, proctoring
├── templates/
│   ├── index.html          # Candidate dashboard
│   └── exam.html           # Proctored exam interface
├── uploads/                # Uploaded resumes and company docs
├── main.py
├── rag_engine.py
└── requirements.txt
```

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/` | Candidate dashboard | — |
| POST | `/` | Upload and extract resume PDF | — |
| GET | `/exam` | Proctored exam page | — |
| POST | `/submit-answer` | Submit candidate answer for scoring | — |
| POST | `/save-skills` | Save required skills for a role | — |
| POST | `/upload-company-doc` | Upload company knowledge document | — |

---

## Setup and Installation

### Prerequisites

- Python 3.10+
- pip

### Install dependencies

```bash
pip install -r requirements.txt
```

### Run the server

```bash
uvicorn main:app --reload
```

### Open in browser

```
http://127.0.0.1:8000
```

---

## Requirements

```
fastapi
uvicorn
pdfplumber
python-multipart
sentence-transformers
langchain
openai
faiss-cpu
redis
reportlab
```

---

## How It Works — Candidate Flow

1. Candidate visits the dashboard and uploads their resume
2. Clicks **Start Exam** — webcam activates, fullscreen enforced
3. AI generates the first question based on resume + company document
4. Candidate speaks their answer — speech-to-text transcribes in real time
5. Candidate clicks Submit — answer is scored by the evaluator agent
6. System decides: follow-up question or next topic based on score
7. Interview completes — suitability report generated instantly

---

## Scalability

The architecture is designed for horizontal scaling from day one:

- **Stateless FastAPI** — any worker handles any request, load balancer ready
- **Redis session state** — all agents share one source of truth
- **FAISS → Pinecone** swap for production vector store with concurrent access
- **Agent-level scaling** — each agent can be deployed as an independent worker
- **Celery async tasks** — score writes never block the live interview flow

---

## Team

| Member | Role |
|---|---|
| Swarnabh Guha | Frontend development, JavaScript, UI/UX |
| Aadity Setu | APIs, backend development, deployment |
| Ashwath Srinivasan | RAG pipeline, AI integration, system architecture |

---

## Hackathon

**Event:** Hack & Forge 2026
**Problem Statement:** PS-2 — Web-Based Intelligent Selector–Applicant Simulation Platform for Enterprise Recruitment
**Track:** Enterprise AI

---
