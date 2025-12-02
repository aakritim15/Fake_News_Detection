import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import torch
import torch.nn as nn
import re
import string
from dotenv import load_dotenv
from reddit_integration import RedditFactChecker

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define PyTorch model architecture
class FakeNewsClassifier(nn.Module):
    def __init__(self, input_dim):
        super(FakeNewsClassifier, self).__init__()
        self.fc = nn.Linear(input_dim, 2)

    def forward(self, x):
        return self.fc(x)

# Text preprocessing
def preprocess_text(text: str) -> str:
    text = text.lower()
    text = re.sub(f"[{string.punctuation}]", "", text)
    return text

# Initialize Flask
app = Flask(__name__)
# Enable CORS
CORS(app, origins=["http://localhost:5173"], methods=["GET", "POST", "OPTIONS"], allow_headers=["Content-Type", "Authorization"])

# Initialize Reddit fact checker
reddit_checker = RedditFactChecker()

# Root endpoint: health check on GET, prediction on POST
@app.route("/", methods=["GET", "POST", "OPTIONS"])
def root():
    if request.method == "OPTIONS":
        return jsonify({}), 204
    if request.method == "GET":
        return jsonify({"status": "ok"}), 200
    # POST -> delegate to predict
    return predict()

# Predict endpoint remains available
@app.route("/predict", methods=["POST", "OPTIONS"])
def predict():
    print("hello")
    if request.method == "OPTIONS":
        return jsonify({}), 204
    data = request.get_json(force=True) or {}
    text = data.get("text", "")
    include_reddit = data.get("include_reddit", False)
    
    if not text:
        return jsonify({"error": "No text provided"}), 400

    cleaned = preprocess_text(text)
    vec = vectorizer.transform([cleaned])

    logger.info(f"Received text length: {len(text)}")
    sk_preds = {name: int(model.predict(vec)[0]) for name, model in models.items()}
    logger.info("sk_preds", sk_preds)
    ml_predictions = {name: ("Real" if p == 1 else "Fake") for name, p in sk_preds.items()}
    
    response = {"ml_predictions": ml_predictions}
    
    # Add Reddit fact-checking if requested
    if include_reddit:
        try:
            discussions = reddit_checker.search_related_discussions(text)
            credibility_analysis = reddit_checker.analyze_credibility_signals(discussions)
            
            response["reddit_analysis"] = {
                "discussions": discussions[:5],  # Return top 5 discussions
                "credibility": credibility_analysis
            }
        except Exception as e:
            logger.error(f"Reddit analysis failed: {e}")
            response["reddit_analysis"] = {"error": "Reddit analysis unavailable"}
    
    return jsonify(response)


# New endpoint for fetching hot posts from news subreddits
@app.route("/fetch-hot-posts", methods=["POST", "OPTIONS"])
def fetch_hot_posts():
    if request.method == "OPTIONS":
        return jsonify({}), 204
    
    data = request.get_json(force=True) or {}
    subreddits = data.get("subreddits", ["news", "worldnews", "politics"])
    limit = data.get("limit", 10)
    
    try:
        posts = reddit_checker.fetch_hot_posts(subreddits, limit)
        return jsonify({
            "subreddits": subreddits,
            "posts": posts,
            "total_found": len(posts)
        })
    except Exception as e:
        logger.error(f"Failed to fetch hot posts: {e}")
        return jsonify({"error": f"Failed to fetch hot posts: {str(e)}"}), 500


# New endpoint specifically for Reddit fact-checking
@app.route("/fact-check", methods=["POST", "OPTIONS"])
def fact_check():
    if request.method == "OPTIONS":
        return jsonify({}), 204
    
    data = request.get_json(force=True) or {}
    text = data.get("text", "")
    
    if not text:
        return jsonify({"error": "No text provided"}), 400
    
    try:
        # Get ML predictions
        cleaned = preprocess_text(text)
        vec = vectorizer.transform([cleaned])
        sk_preds = {name: int(model.predict(vec)[0]) for name, model in models.items()}
        ml_predictions = {name: ("Real" if p == 1 else "Fake") for name, p in sk_preds.items()}
        
        # Get Reddit discussions
        discussions = reddit_checker.search_related_discussions(text)
        credibility_analysis = reddit_checker.analyze_credibility_signals(discussions)
        
        # Combine analysis
        response = {
            "ml_predictions": ml_predictions,
            "reddit_discussions": discussions,
            "credibility_analysis": credibility_analysis,
            "combined_assessment": _generate_combined_assessment(ml_predictions, credibility_analysis)
        }
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Fact-check failed: {e}")
        return jsonify({"error": f"Fact-check analysis failed: {str(e)}"}), 500

def _generate_combined_assessment(ml_predictions, credibility_analysis):
    """Generate a combined assessment from ML and Reddit analysis"""
    # Count ML predictions
    fake_count = sum(1 for pred in ml_predictions.values() if pred == "Fake")
    real_count = len(ml_predictions) - fake_count
    
    ml_confidence = "High" if abs(fake_count - real_count) >= 3 else "Medium" if abs(fake_count - real_count) >= 1 else "Low"
    ml_verdict = "Likely Fake" if fake_count > real_count else "Likely Real"
    
    # Reddit credibility
    reddit_score = credibility_analysis.get('credibility_score', 0.5)
    reddit_verdict = "Credible" if reddit_score > 0.6 else "Questionable" if reddit_score > 0.4 else "Low Credibility"
    
    return {
        "ml_verdict": ml_verdict,
        "ml_confidence": ml_confidence,
        "reddit_verdict": reddit_verdict,
        "reddit_score": reddit_score,
        "recommendation": f"ML models suggest this is {ml_verdict.lower()} with {ml_confidence.lower()} confidence. Reddit discussions indicate {reddit_verdict.lower()} based on community engagement."
    }

# Load models directory
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

# Load vectorizer and sklearn models
vectorizer = joblib.load(os.path.join(MODEL_DIR, "vectorizer.pkl"))
models = {
    "Logistic Regression": joblib.load(os.path.join(MODEL_DIR, "Logistic_Regression.pkl")),
    "Naive Bayes":       joblib.load(os.path.join(MODEL_DIR, "Naive_Bayes.pkl")),
    "Random Forest":     joblib.load(os.path.join(MODEL_DIR, "Random_Forest.pkl")),
    "Gradient Boosting": joblib.load(os.path.join(MODEL_DIR, "Gradient_Boosting.pkl")),
}

# Load PyTorch model
input_dim = vectorizer.max_features
pytorch_model = FakeNewsClassifier(input_dim)
pth_path = os.path.join(MODEL_DIR, "fake_news_model.pth")
pytorch_model.load_state_dict(torch.load(pth_path, map_location="cpu"))
pytorch_model.eval()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    logger.info(f"Starting server on 0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port)
