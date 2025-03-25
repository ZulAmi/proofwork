import os
import time
import math
import json
from datetime import datetime
from typing import List, Dict, Optional, Any

import uvicorn
import httpx
from fastapi import FastAPI, HTTPException, Depends, Query, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from web3 import Web3
from transformers import pipeline
import numpy as np
import redis
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("trust-score-api.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Freelancer Trust Score API",
    description="API for calculating reputation trust scores for freelancers using NLP and weighted scoring",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Redis (for caching)
try:
    redis_client = redis.Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", 6379)),
        password=os.getenv("REDIS_PASSWORD", ""),
        decode_responses=True
    )
    redis_client.ping()  # Test connection
    USE_REDIS = True
    logger.info("Redis cache initialized successfully")
except:
    logger.warning("Redis connection failed. Running without cache.")
    USE_REDIS = False

# Initialize sentiment analysis model
try:
    # Use a lightweight model for efficiency
    sentiment_analyzer = pipeline(
        "sentiment-analysis", 
        model="distilbert-base-uncased-finetuned-sst-2-english",
        device=-1  # Use CPU (-1) or GPU (0)
    )
    logger.info("NLP sentiment model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load sentiment model: {str(e)}")
    sentiment_analyzer = None

# Initialize blockchain connection (if applicable)
try:
    w3 = Web3(Web3.HTTPProvider(os.getenv("WEB3_PROVIDER_URI", "http://localhost:8545")))
    contract_address = os.getenv("CONTRACT_ADDRESS")
    contract_abi = json.loads(os.getenv("CONTRACT_ABI", "[]"))
    
    if contract_address and w3.is_connected() and contract_abi:
        contract = w3.eth.contract(address=contract_address, abi=contract_abi)
        USE_BLOCKCHAIN = True
        logger.info(f"Blockchain connection established: {w3.eth.chain_id}")
    else:
        USE_BLOCKCHAIN = False
        logger.warning("Blockchain configuration incomplete, using API fallback")
except Exception as e:
    logger.warning(f"Blockchain connection failed: {str(e)}")
    USE_BLOCKCHAIN = False

# Constants for trust score calculation
TIME_DECAY_FACTOR = float(os.getenv("TIME_DECAY_FACTOR", "0.05"))  # Controls how quickly old reviews lose value
TIME_UNIT = 60 * 60 * 24 * 30  # 30 days in seconds
SENTIMENT_WEIGHT = float(os.getenv("SENTIMENT_WEIGHT", "0.3"))  # Impact of sentiment on score
VERIFIED_CLIENT_WEIGHT = float(os.getenv("VERIFIED_CLIENT_WEIGHT", "1.5"))  # Multiplier for verified clients
UNVERIFIED_CLIENT_WEIGHT = float(os.getenv("UNVERIFIED_CLIENT_WEIGHT", "0.8"))  # Multiplier for unverified clients
CACHE_TTL = int(os.getenv("CACHE_TTL", "3600"))  # Cache time-to-live in seconds

# Data models
class Review(BaseModel):
    client_address: str
    client_verified: bool = False
    rating: int = Field(..., ge=1, le=5)
    comment: str
    timestamp: int  # Unix timestamp
    
class FreelancerData(BaseModel):
    address: str
    reviews: List[Review] = []
    
class TrustScore(BaseModel):
    address: str
    score: float = Field(..., ge=0, le=100)
    confidence: float = Field(..., ge=0, le=1)  # Confidence in the score (based on number of reviews)
    review_count: int
    average_rating: float
    sentiment_adjustment: float
    recency_factor: float
    calculation_time: str

# Function to fetch reviews from blockchain
async def fetch_blockchain_reviews(freelancer_address: str) -> List[Review]:
    try:
        if not USE_BLOCKCHAIN or not contract:
            return []
            
        # This is a placeholder implementation.
        # In a real application, you would query events or indexed data
        # since blockchain doesn't easily allow iterating through all reviews.
        # This would typically involve a subgraph or indexing service.
        
        reviews = []
        # Placeholder: Get review events from the contract
        # We would typically use something like The Graph or a custom indexer
        
        logger.info(f"Fetched {len(reviews)} reviews from blockchain for {freelancer_address}")
        return reviews
    except Exception as e:
        logger.error(f"Error fetching blockchain reviews: {str(e)}")
        return []

# Function to fetch reviews from API
async def fetch_api_reviews(freelancer_address: str) -> List[Review]:
    try:
        api_url = os.getenv("REVIEWS_API_URL", "http://localhost:3000/api/freelancers")
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{api_url}/{freelancer_address}/reviews")
            
            if response.status_code == 200:
                data = response.json()
                reviews = []
                
                # Convert API response to our Review model
                for item in data.get('data', {}).get('reviews', []):
                    reviews.append(Review(
                        client_address=item['clientAddress'],
                        client_verified=item.get('clientVerified', False),
                        rating=item['rating'],
                        comment=item['comment'],
                        timestamp=item['timestamp']
                    ))
                
                logger.info(f"Fetched {len(reviews)} reviews from API for {freelancer_address}")
                return reviews
            else:
                logger.warning(f"API returned status code {response.status_code}")
                return []
    except Exception as e:
        logger.error(f"Error fetching API reviews: {str(e)}")
        return []

# Function to analyze sentiment from review text
def analyze_sentiment(text: str) -> float:
    """
    Analyze sentiment of review text using NLP model
    Returns a score from -1 (negative) to 1 (positive)
    """
    if not sentiment_analyzer or not text:
        return 0.0
        
    try:
        # Truncate text if it's very long to avoid model issues
        truncated_text = text[:512]
        
        # Get sentiment prediction
        result = sentiment_analyzer(truncated_text)[0]
        
        # Map "POSITIVE"/"NEGATIVE" to numerical score
        if result['label'] == "POSITIVE":
            sentiment_score = result['score']
        else:
            sentiment_score = -result['score']
            
        return sentiment_score
    except Exception as e:
        logger.error(f"Sentiment analysis error: {str(e)}")
        return 0.0  # Neutral sentiment on error

# Calculate time decay factor
def calculate_time_decay(timestamp: int) -> float:
    """
    Apply exponential decay to older reviews
    Recent reviews get weight close to 1, older reviews get less weight
    """
    current_time = int(time.time())
    age_in_seconds = current_time - timestamp
    
    # Convert to our time units and apply decay formula
    age_in_units = age_in_seconds / TIME_UNIT
    decay_factor = math.exp(-TIME_DECAY_FACTOR * age_in_units)
    
    return decay_factor

# Calculate trust score from reviews
def calculate_trust_score(reviews: List[Review]) -> TrustScore:
    """
    Calculate comprehensive trust score based on reviews, taking into account:
    - Star ratings
    - Sentiment analysis
    - Client verification status
    - Time decay (recent reviews matter more)
    """
    if not reviews:
        return {
            "score": 50,  # Neutral score for no reviews
            "confidence": 0,
            "review_count": 0,
            "average_rating": 0,
            "sentiment_adjustment": 0,
            "recency_factor": 1,
            "calculation_time": datetime.now().isoformat()
        }
    
    weighted_sum = 0
    weight_sum = 0
    sentiment_sum = 0
    
    for review in reviews:
        # Calculate weights
        time_weight = calculate_time_decay(review.timestamp)
        client_weight = VERIFIED_CLIENT_WEIGHT if review.client_verified else UNVERIFIED_CLIENT_WEIGHT
        
        # Calculate total weight for this review
        total_weight = time_weight * client_weight
        
        # Add to weighted sum (for ratings)
        weighted_sum += review.rating * total_weight
        weight_sum += total_weight
        
        # Process sentiment if comment exists
        if review.comment:
            sentiment_score = analyze_sentiment(review.comment)
            sentiment_sum += sentiment_score * total_weight
    
    # Calculate base weighted rating (1-5 scale)
    weighted_rating = weighted_sum / weight_sum if weight_sum > 0 else 3  # Default to neutral
    
    # Calculate average sentiment (-1 to 1 scale)
    average_sentiment = sentiment_sum / weight_sum if weight_sum > 0 else 0
    
    # Apply sentiment adjustment (adjust by up to +/- 0.5 stars)
    sentiment_adjustment = average_sentiment * SENTIMENT_WEIGHT
    
    # Calculate final score (adjusted rating)
    adjusted_rating = min(5, max(1, weighted_rating + sentiment_adjustment))
    
    # Convert to 0-100 scale
    trust_score = (adjusted_rating - 1) * 25
    
    # Calculate confidence based on number of reviews
    # More reviews = higher confidence, up to a maximum
    confidence = min(1.0, (len(reviews) / 10))  # Max confidence at 10+ reviews
    
    # Calculate recency factor (how recent are the reviews on average)
    avg_decay = sum(calculate_time_decay(r.timestamp) for r in reviews) / len(reviews)
    
    return {
        "score": round(trust_score, 1),
        "confidence": round(confidence, 2),
        "review_count": len(reviews),
        "average_rating": round(weighted_rating, 2),
        "sentiment_adjustment": round(sentiment_adjustment, 2),
        "recency_factor": round(avg_decay, 2),
        "calculation_time": datetime.now().isoformat()
    }

# API endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "sentiment_model": sentiment_analyzer is not None,
        "blockchain_connection": USE_BLOCKCHAIN,
        "cache_available": USE_REDIS
    }

@app.get("/api/freelancers/{address}/trust-score")
async def get_trust_score(
    address: str, 
    force_refresh: bool = Query(False, description="Force recalculation instead of using cache"),
    api_key: Optional[str] = Header(None)
):
    """
    Get trust score for a freelancer based on their reviews
    
    - address: Ethereum address of the freelancer
    - force_refresh: Set to True to force recalculation instead of using cache
    """
    # Validate API key if required
    required_api_key = os.getenv("REQUIRED_API_KEY")
    if required_api_key and api_key != required_api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    
    # Check cache first if not forcing refresh
    if USE_REDIS and not force_refresh:
        cached_score = redis_client.get(f"trust_score:{address}")
        if cached_score:
            logger.info(f"Returning cached trust score for {address}")
            return json.loads(cached_score)
    
    # Fetch reviews from blockchain and/or API
    blockchain_reviews = await fetch_blockchain_reviews(address)
    api_reviews = await fetch_api_reviews(address)
    
    # Combine and deduplicate reviews based on client address
    seen_clients = set()
    combined_reviews = []
    
    # Prioritize blockchain reviews (considered more reliable)
    for review in blockchain_reviews:
        combined_reviews.append(review)
        seen_clients.add(review.client_address)
    
    # Add API reviews not already included
    for review in api_reviews:
        if review.client_address not in seen_clients:
            combined_reviews.append(review)
            seen_clients.add(review.client_address)
    
    if not combined_reviews:
        logger.warning(f"No reviews found for freelancer {address}")
    
    # Calculate trust score
    trust_score = calculate_trust_score(combined_reviews)
    trust_score["address"] = address
    
    # Store in cache if available
    if USE_REDIS:
        redis_client.set(
            f"trust_score:{address}",
            json.dumps(trust_score),
            ex=CACHE_TTL
        )
    
    return trust_score

@app.get("/api/freelancers/{address}/reviews/analyze")
async def analyze_reviews(
    address: str,
    api_key: Optional[str] = Header(None)
):
    """
    Analyze reviews for a freelancer without calculating a trust score
    Returns sentiment analysis and other metrics for individual reviews
    """
    # Validate API key if required
    required_api_key = os.getenv("REQUIRED_API_KEY")
    if required_api_key and api_key != required_api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
    
    # Fetch reviews
    blockchain_reviews = await fetch_blockchain_reviews(address)
    api_reviews = await fetch_api_reviews(address)
    
    # Combine reviews without deduplication for analysis purposes
    combined_reviews = blockchain_reviews + api_reviews
    
    if not combined_reviews:
        return {"address": address, "reviews": [], "analysis": {}}
    
    # Analyze each review
    analyzed_reviews = []
    for review in combined_reviews:
        sentiment_score = analyze_sentiment(review.comment)
        time_decay = calculate_time_decay(review.timestamp)
        
        analyzed_reviews.append({
            "client_address": review.client_address,
            "client_verified": review.client_verified,
            "rating": review.rating,
            "comment": review.comment,
            "timestamp": review.timestamp,
            "datetime": datetime.fromtimestamp(review.timestamp).isoformat(),
            "sentiment_score": round(sentiment_score, 2),
            "time_decay_factor": round(time_decay, 2),
            "effective_weight": round(
                time_decay * (VERIFIED_CLIENT_WEIGHT if review.client_verified else UNVERIFIED_CLIENT_WEIGHT),
                2
            )
        })
    
    # Calculate overall stats
    avg_rating = sum(r.rating for r in combined_reviews) / len(combined_reviews)
    avg_sentiment = sum(analyze_sentiment(r.comment) for r in combined_reviews) / len(combined_reviews)
    
    return {
        "address": address,
        "reviews": analyzed_reviews,
        "analysis": {
            "review_count": len(analyzed_reviews),
            "average_rating": round(avg_rating, 2),
            "average_sentiment": round(avg_sentiment, 2),
            "verified_client_percentage": round(
                sum(1 for r in combined_reviews if r.client_verified) / len(combined_reviews) * 100, 
                1
            )
        }
    }

# Run the app
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("ai-trust-score:app", host="0.0.0.0", port=port, reload=True)