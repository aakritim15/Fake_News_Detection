from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import torch
import torch.nn as nn
import re
import string
from sklearn.feature_extraction.text import TfidfVectorizer

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend communication

# Load Scikit-learn models
vectorizer = joblib.load("vectorizer.pkl")
models = {
    "Logistic Regression": joblib.load("Logistic_Regression.pkl"),
    "Naive Bayes": joblib.load("Naive_Bayes.pkl"),
    "Random Forest": joblib.load("Random_Forest.pkl"),
    "Gradient Boosting": joblib.load("Gradient_Boosting.pkl")
}

# Load PyTorch model
class FakeNewsClassifier(nn.Module):
    def __init__(self, input_dim):
        super(FakeNewsClassifier, self).__init__()
        self.fc = nn.Linear(input_dim, 2)

    def forward(self, x):
        return self.fc(x)

input_dim = vectorizer.max_features
pytorch_model = FakeNewsClassifier(input_dim)
pytorch_model.load_state_dict(torch.load("fake_news_model.pth"))
pytorch_model.eval()

# Preprocessing function
def preprocess_text(text):
    text = text.lower()
    text = re.sub(f"[{string.punctuation}]", "", text)  # Remove punctuation
    return text

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    text = data.get("text", "")

    if not text:
        return jsonify({"error": "No text provided"}), 400

    processed_text = preprocess_text(text)
    input_vec = vectorizer.transform([processed_text])

    predictions = {name: int(model.predict(input_vec)[0]) for name, model in models.items()}

    # # PyTorch Prediction
    # input_tensor = torch.tensor(input_vec.toarray(), dtype=torch.float32)
    # output = pytorch_model(input_tensor)
    # pytorch_pred = torch.argmax(output, dim=1).item()
    # predictions["PyTorch Model"] = pytorch_pred

    response = {name: "Real" if pred == 1 else "Fake" for name, pred in predictions.items()}
    
    return jsonify(response)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
   