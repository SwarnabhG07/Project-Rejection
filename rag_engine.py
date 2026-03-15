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
        print(f"DEBUG: Required Skills: {skills_required}")
        print(f"DEBUG: Resume Text Length: {len(resume_text)} characters")
        
        """Identifies the intersection of skills/topics."""
        sys_prompt = "You are an expert technical recruiter. Evaluate the candidate's resume against the required technical skills."
        user_prompt = f"""
        Required Skills: {skills_required}
        
        Resume Text:
        {resume_text}
        
        Task: 
        Identify which of the Required Skills are explicitly mentioned in the Resume Text.
        
        Return exactly as JSON:
        {{
            "common_topics": ["<matched_skill_1>", "<matched_skill_2>"]
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

        result_dict = self._parse_json_safely(response.choices[0].message.content)
        self.topics = result_dict.get("common_topics", [])
        print(f"DEBUG: Extracted Topics from Resume: {self.topics}")
        
        required_list = [s.strip().lower() for s in skills_required.split(",")]
        
        if not required_list:
            return False, []
            
        match_ratio = len(self.topics) / len(required_list)
        is_match = match_ratio >= 0.40
    
        print(f"DEBUG: Required: {len(required_list)}, Matched: {len(self.topics)}, Ratio: {match_ratio:.2f}")
        
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
            sys_msg = "You are an AI generating semantic search queries for a vector database (FAISS). Your goal is to find technical documentation to challenge the candidate's previous answer."
            user_msg = "Identify the core technical concept or weakness in the candidate's last answer. Return ONLY a concise, keyword-rich search query (max 5-7 words) to retrieve deep technical context about that specific concept. No conversational filler."
        else:
            sys_msg = "You are an AI generating semantic search queries for a vector database (FAISS) to extract interview context."
            user_msg = f"Available topics: {self.topics}. Select ONE topic not yet discussed in the conversation history. Return ONLY a concise, keyword-rich search query (max 5-7 words) to retrieve advanced engineering documentation on that topic. No conversational filler."
        
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

        sys_prompt = "You are a Principal Engineer conducting a technical interview. Frame questions that test practical application, architectural trade-offs, or edge cases."
        user_prompt = f'''Based strictly on the following context, generate ONE concise, challenging interview question. 

        Rules:
        1. Do NOT ask for a simple definition.
        2. Pose a scenario, ask about a trade-off, or ask how to handle a specific edge case mentioned in the context.
        3. Do not include the answer in your question.
        4. Keep it under 3 sentences.

        Context: {context}

        Question:'''

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
        sys_prompt = "You are a strict technical evaluator grading an interview answer against official context."
        user_prompt = f"""
        Evaluate the candidate's answer based STRICTLY on the provided context. Do not use outside knowledge.

        Context: {context}
        Candidate Answer: {candidate_answer}

        Scoring Rubric (0 to 10 for each):
        - relevance: Does the answer address the question asked?
        - accuracy: Is the technical information factually correct according to the context?
        - overall_score: The average of relevance and accuracy.

        Provide a JSON object exactly in this format:
        {{
            "overall_score": <float 0-10>, 
            "relevance": <int 0-10>, 
            "accuracy": <int 0-10>, 
            "explanation": "<1-2 sentences justifying the scores and pointing out missing context>"
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
    

