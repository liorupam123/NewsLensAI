import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
from sentence_transformers import SentenceTransformer, util
import torch
from dotenv import load_dotenv

# --- App & Model Initialization ---
load_dotenv()
app = FastAPI()

# --- Load Models at Startup ---
# A. Summarization Model
print("Loading summarization model...")
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")

# B. Sentence Transformer for Semantic Search Embeddings
print("Loading sentence transformer model...")
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

# C. Your Fine-Tuned Classification Model
# Using a relative path is more portable
CLASSIFICATION_MODEL_PATH = "./models/bert-finetuned-agnews"
try:
    print("Loading fine-tuned classification model...")
    classification_tokenizer = AutoTokenizer.from_pretrained(CLASSIFICATION_MODEL_PATH)
    classification_model = AutoModelForSequenceClassification.from_pretrained(CLASSIFICATION_MODEL_PATH)
    classification_pipeline = pipeline("text-classification", model=classification_model, tokenizer=classification_tokenizer)
except Exception as e:
    print(f"Classification model not found. Running without classification. Error: {e}")
    classification_pipeline = None

NEWS_API_KEY = os.getenv("NEWS_API_KEY")

# --- Pydantic Models for API Requests ---
class AnalyzeRequest(BaseModel):
    query: str

class SummarizeRequest(BaseModel):
    text: str # This model will be used for the new text summarizer

# --- API Endpoints ---

@app.get("/")
def root():
    return {"message": "News Analyst AI Service is running"}


@app.post("/analyze-topic")
async def analyze_topic(request: AnalyzeRequest):
    query = request.query
    print(f"Analyzing topic with semantic search: {query}")

    # 1. Fetch a larger pool of articles from NewsAPI
    try:
        news_url = f"https://newsapi.org/v2/everything?q={query}&pageSize=25&language=en&apiKey={NEWS_API_KEY}"
        response = requests.get(news_url)
        response.raise_for_status()
        articles = response.json().get("articles", [])
        if not articles:
            raise HTTPException(status_code=404, detail="Could not find news articles for this topic.")
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Error fetching news: {e}")

    # 2. Perform Semantic Search
    article_texts = [article.get('title', '') + ". " + article.get('description', '') for article in articles if article.get('description')]
    query_embedding = embedding_model.encode(query, convert_to_tensor=True)
    article_embeddings = embedding_model.encode(article_texts, convert_to_tensor=True)
    
    cosine_scores = util.cos_sim(query_embedding, article_embeddings)
    top_results = torch.topk(cosine_scores, k=min(5, len(articles)))
    semantic_articles = [articles[i] for i in top_results.indices[0].tolist()]

    # 3. Classify and Summarize the top semantic results
    combined_text = ""
    classification_results = {}
    for article in semantic_articles:
        text_to_classify = article.get('title', '') + ". " + article.get('description', '')
        combined_text += text_to_classify + " "
        
        if classification_pipeline:
            prediction = classification_pipeline(text_to_classify, return_all_scores=False)[0]
            label = prediction['label']
            classification_results[label] = classification_results.get(label, 0) + 1

    # 4. Generate a longer summary
    summary = summarizer(combined_text, max_length=300, min_length=100, do_sample=False)[0]['summary_text']
    
    # 5. Prepare final response
    top_5_links = [{"title": article["title"], "link": article["url"]} for article in semantic_articles]

    return {
        "summary": summary,
        "top_articles": top_5_links,
        "classification_breakdown": classification_results if classification_pipeline else "N/A"
    }


# --- NEWLY ADDED ENDPOINT FOR TEXT SUMMARIZATION ---
@app.post("/summarize-text")
async def summarize_text(request: SummarizeRequest):
    """
    Summarizes a block of text provided by the user.
    """
    if not summarizer:
        raise HTTPException(status_code=500, detail="Summarization model is not available.")
    
    print("Summarizing provided text...")
    
    try:
        article_text = request.text
        if len(article_text) < 150:
            raise HTTPException(status_code=400, detail="Please provide more text to summarize.")

        summary = summarizer(article_text, max_length=150, min_length=40, do_sample=False)[0]['summary_text']
        return {"summary": summary}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {e}")