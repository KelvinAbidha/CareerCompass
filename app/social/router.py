from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# Configure the API key
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

class GeneratePostRequest(BaseModel):
    prompt: str

@router.post("/generate-post")
async def generate_post(request: GeneratePostRequest):
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY environment variable not set")
    
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(request.prompt)
        # Format the response to match what the frontend expects
        return {
            "candidates": [{
                "content": {
                    "parts": [{
                        "text": response.text
                    }]
                }
            }]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
