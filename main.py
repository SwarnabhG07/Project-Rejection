from fastapi import FastAPI, File, UploadFile, Request, Form
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from rag_engine import InterviewRAG
import pdfplumber
import shutil
import os
import uuid
from datetime import datetime
import json

app = FastAPI()
rag_engine = InterviewRAG()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

RESULTS_FOLDER = "interview_results" 
os.makedirs(RESULTS_FOLDER, exist_ok=True)

# We are upgrading the state to hold a transcript. 
# WARNING: This global state is still not multi-tenant safe. 
exam_state = {
    "session_id": str(uuid.uuid4()),
    "question_count": 0,
    "max_questions": 5,  # <-- Set your maximum number of questions here
    "current_question": "",
    "current_context": "",
    "is_complete": False,
    "transcript": []     # <-- This will store the Q&A and Agent 4's evaluations
}

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/exam", response_class=HTMLResponse)
async def exam(request: Request):
    return templates.TemplateResponse("exam.html", {"request": request})

resume_skill = {
    "resume_text": "",
    "req_skill": ""
}

exam_state = {
    "session_id": str(uuid.uuid4()),
    "question_count": 0,
    "max_questions": 5,
    "current_question": "",
    "current_context": "",
    "is_complete": False,
    "transcript": []
}

@app.post("/resume-upload")
async def upload_file(pdf_file: UploadFile = File(...)):
    if not pdf_file.filename.endswith(".pdf"):
        return JSONResponse(status_code=400, content={"error": "Only PDF files accepted"})

    file_path = os.path.join(UPLOAD_FOLDER, pdf_file.filename)

    # save file
    with open(file_path, "wb") as f:
        shutil.copyfileobj(pdf_file.file, f)

    # extract text
    all_text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            all_text += page.extract_text() or ""

    resume_skill["document_text"] = all_text
    
    # Check if skills exist before processing
    if resume_skill.get("req_skill"):
        is_match, topics = rag_engine.agent_one(resume_skill["req_skill"], resume_skill["resume_text"])
        
        # Return the match result to the frontend
        return {
            "message": "Resume processed successfully", 
            "is_match": is_match, 
            "topics": topics
        }
    else:
        # Trigger the 400 error alert on the frontend
        return JSONResponse(
            status_code=400, 
            content={"error": "pls give me the required skills before uploading resume"}
        )


@app.post("/save-skills")
async def save_skills(required_skills: str = Form(...)):
    resume_skill["req_skill"] = required_skills
    return {"skills": required_skills}

@app.get("/api/question")
async def get_next_question():
    """Fetches the current question or generates the first one."""
    global exam_state
    
    if exam_state["is_complete"]:
        return JSONResponse({"question": None, "is_complete": True})

    # If it's the very first question, we need to generate it
    if exam_state["question_count"] == 0:
        if not rag_engine.topics:
            return JSONResponse({"error": "No resume topics found."}, status_code=400)
            
        # Agent 2: Formulate initial query
        query = rag_engine.agent_two(elaborate=False)
        
        # RAG Retrieval
        context = rag_engine.query_context(query)
        
        # Agent 3: Generate the actual question
        question = rag_engine.agent_three(context)
        
        exam_state["current_question"] = question
        exam_state["current_context"] = context
        exam_state["question_count"] = 1

    return {"question": exam_state["current_question"], "is_complete": False}


@app.post("/submit-answer")
async def submit_and_evaluate(spoken_answer: str = Form(...)):
    """Receives answer, evaluates it, saves to transcript, and pre-generates the NEXT question."""
    global exam_state
    
    if exam_state["is_complete"]:
        return {"message": "Exam is already finished.", "is_complete": True}

    # 1. Agent 4: Evaluate the candidate's answer against the active context
    evaluation = rag_engine.agent_four(spoken_answer, exam_state["current_context"])
    
    # 2. Append the interaction to our session transcript
    exam_state["transcript"].append({
        "question_number": exam_state["question_count"],
        "question": exam_state["current_question"],
        "candidate_answer": spoken_answer,
        "ai_evaluation": evaluation
    })

    # 3. Check if we have hit the maximum number of questions
    if exam_state["question_count"] >= exam_state["max_questions"]:
        exam_state["is_complete"] = True
        
        # Write the final results to a unique file
        file_path = os.path.join(RESULTS_FOLDER, f"result_{exam_state['session_id']}.json")
        
        final_output = {
            "session_id": exam_state["session_id"],
            "timestamp": datetime.now().isoformat(),
            "total_questions": exam_state["question_count"],
            "transcript": exam_state["transcript"]
        }
        
        # Standard synchronous file write (ideally this should be offloaded to a background task)
        with open(file_path, "w") as f:
            json.dump(final_output, f, indent=4)
            
        print(f"Exam complete. Results saved to {file_path}")
        return {"message": "Final answer saved. Exam complete.", "is_complete": True}

    # 4. If not complete, Agent 2 & 3: Generate the NEXT question based on history
    next_query = rag_engine.agent_two(elaborate=True)
    next_context = rag_engine.query_context(next_query)
    next_question = rag_engine.agent_three(next_context)

    # 5. Update State for the next round
    exam_state["current_question"] = next_question
    exam_state["current_context"] = next_context
    exam_state["question_count"] += 1

    return {"message": "Answer evaluated and next question ready.", "is_complete": False}

@app.post("/upload-company-doc")
async def upload_company_file(pdf_file: UploadFile = File(...)):
    if not pdf_file.filename.endswith(".pdf"):
        return JSONResponse({"error": "Only PDF files accepted"}, status_code=400)

    file_path = os.path.join(UPLOAD_FOLDER, pdf_file.filename)

    # save file
    with open(file_path, "wb") as f:
        shutil.copyfileobj(pdf_file.file, f)

    # extract text
    all_text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            all_text += page.extract_text() or ""

    rag_engine.ingest_docs([all_text])

    return {"message": all_text}