from openai import OpenAI
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
import os
from dotenv import load_dotenv
import pydantic
import json
from collections import deque

load_dotenv(override=True)

class InterviewRAG:
    def __init__(self):
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.gemini_url = "https://generativelanguage.googleapis.com/v1beta/openai/"
        self.gemini = OpenAI(api_key=self.gemini_api_key, base_url= self.gemini_url)
        self.model = "gemini-3.1-flash-lite-preview"
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        self.vector_store = None
        self.topics = []
        self.conversation_history = deque(maxlen=10) 

    def _parse_json_safely(self, text: str) -> dict:
        """Helper to strip markdown backticks before parsing JSON."""
        clean_text = text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
        return json.loads(clean_text.strip())

    def agent_one(self, skills_required, resume_text):
        """Identifies the intersection of skills/topics."""
        sys_prompt = "You are a recruitment architect. Compare the candidate's resume and the company docs."
        user_prompt = f"""
        1. Check whether the skills given exist in the resume
        2. If less than 60% skills match return match : no 
        3. If more than 60% skills match return match : yes
        3. Return the overlapping skills.
        
        Resume: {resume_text}
        Skills: {skills_required}
        
        Return exactly as JSON: {{"common_topics": ["skill1", "skill2", "skill3"], "match": "yes"}}
        """
        
        response = self.gemini.chat.completions.create(
            model=self.model,
            messages=[
                {"role":"system","content":sys_prompt},
                {"role":"user","content":user_prompt}
            ],
            response_format={"type": "json_object"}
        )

        result_dict = self._parse_json_safely(response.choices[0].message.content)
        
        is_match = result_dict.get("match", "").lower() == "yes"
        self.topics = result_dict.get("common_topics", [])
        
        return is_match, self.topics

    def ingest_docs(self, texts: list[str]):
        """Splits and embeds company knowledge using local MiniLM."""
        splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
        docs = splitter.create_documents(texts)
        self.vector_store = FAISS.from_documents(docs, self.embeddings)
    
    def query_context(self, document_text: str):
        """Retrieves top-k chunks."""
        if not self.vector_store:
            return ""
        results = self.vector_store.similarity_search(document_text, k=5)
        return "\n---\n".join([r.page_content for r in results])

    def agent_two(self, elaborate: bool = False):
        if elaborate:
            sys_msg = "Form a search query to retrieve context for a follow-up interview question based on the candidate's last answer."
            user_msg = "Return ONLY the query string based on the last topic and answer."
        else:
            sys_msg = "Form a search query to retrieve context for a new interview topic."
            user_msg = f"Available topics are: {self.topics}. Choose ONE topic not covered in the history, and return ONLY a technical search query for that topic."
        
        messages = [{"role": "system", "content": sys_msg}]
        messages.extend(self.conversation_history) 
        messages.append({"role": "user", "content": user_msg})
        
        response = self.gemini.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.2 
        )
        return response.choices[0].message.content

    def agent_three(self, context: str):

        sys_prompt = "You are a technical interviewer. Frame a challenging, concise question based strictly on the provided context."
        user_prompt = f"Context: {context}\n\nAsk a challenging question based on this context:"

        response = self.gemini.chat.completions.create(
            model=self.model,
            messages=[
                {"role":"system","content":sys_prompt},
                {"role":"user","content":user_prompt}
            ]
        )

        self.conversation_history.append({"role": "user", "content": f"Question: {response.choices[0].message.content}"})

        return response.choices[0].message.content

    def agent_four(self, candidate_answer, context):
        self.conversation_history.append({"role": "user", "content": f"Candidate Answer: {candidate_answer}"})
        """Evaluates the candidate's answer against the context."""
        sys_prompt = "Evaluate the candidate's answer strictly against the provided company context. Return JSON."
        user_prompt = f"""
        Context: {context}
        Candidate Answer: {candidate_answer}
        
        Provide a JSON object exactly in this format:
        {{
            "overall_score": 0, 
            "relevance": 0, 
            "accuracy": 0, 
            "explanation": "string"
        }}
        """

        response = self.gemini.chat.completions.create(
            model=self.model,
            messages=[
                {"role":"system","content":sys_prompt},
                {"role":"user","content":user_prompt}
            ],
            response_format={"type": "json_object"}
        )
        return self._parse_json_safely(response.choices[0].message.content)
    

