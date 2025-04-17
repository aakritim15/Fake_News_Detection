import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import torch
import torch.nn as nn
import re
import string

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
# Enable CORS with explicit methods and headers
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# Global CORS headers for preflight
@app.after_request
def apply_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    return response

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
    if request.method == "OPTIONS":
        return jsonify({}), 204
    data = request.get_json(force=True) or {}
    text = data.get("text", "")
    if not text:
        return jsonify({"error": "No text provided"}), 400

    cleaned = preprocess_text(text)
    vec = vectorizer.transform([cleaned])

    logger.info(f"Received text length: {len(text)}")
    sk_preds = {name: int(model.predict(vec)[0]) for name, model in models.items()}
    response = {name: ("Real" if p == 1 else "Fake") for name, p in sk_preds.items()}
    return jsonify(response)

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
