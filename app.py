from fastapi import FastAPI, File, UploadFile, Request, Form
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
import pdfplumber
import shutil
import os

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})
@app.get("/exam", response_class=HTMLResponse)
async def exam(request: Request):
    return templates.TemplateResponse("exam.html", {"request": request})
@app.post("/")
async def upload_file(pdf_file: UploadFile = File(...)):
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

    return {"message": all_text}
@app.post("/save-skills")
async def save_skills(required_skills: str = Form(...)):
    return {"skills": required_skills}
@app.post("/submit-answer")
async def submit_answer(spoken_answer: str = Form(...)):
    return {"answer": spoken_answer}
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

    return {"message": all_text}
