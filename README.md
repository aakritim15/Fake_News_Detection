# Fake_News_Detection
The project aims to develop a machine-learning model capable of identifying and classifying any news article as fake or not. The distribution of fake news can potentially have highly adverse effects on people and culture. This project involves building and training a model to classify news as fake news or not using a diverse dataset of news articles. We have used four techniques to determine the results of the model:
1. Logistic Regression
2. Naive Bayes 
3. Random Forest Classifier
4. Gradient Boosting Classifier


# Problem Definition
In the era of digital information, the rapid spread of fake news has become a significant problem, affecting public opinion, political landscapes, and societal trust. News articles, particularly those shared through social media platforms, may contain misleading or completely fabricated information. The challenge is to automatically distinguish between fake and real news based on the text, style, and structure of the articles.
The goal is to build a classification model that can take a given news article as input and predict whether it is "fake" or "real." The solution will involve preprocessing the news articles, extracting features from the text (such as word frequency, sentiment, n-grams, etc.), and applying machine learning algorithms to classify the articles.

🔍 Fake News Detection App – Full Stack Overview
🧠 Purpose:
A machine learning-based web application that classifies news articles as Fake or Real using multiple models and provides interactive educational tools.

🧱 Tech Stack:
🔗 Frontend:
Framework: React (with TypeScript)
Styling: Tailwind CSS
UI Components: ShadCN UI (Cards, Tabs, Buttons, Inputs)

Features:
News input & analysis UI
Interactive prediction results
Educational games (Quiz, Speed Challenge, Leaderboard)
Theme toggle (Dark/Light Mode)

⚙️ Backend (API):
Framework: Flask (Python)
Model Serving:
Logistic Regression
Naive Bayes
Random Forest
Gradient Boosting
PyTorch Model (Simple linear classifier)
Text Preprocessing: Lowercasing, punctuation removal
CORS Handling: Flask-CORS
Model Handling: joblib + PyTorch
Logging: Python logging

📦 Machine Learning:
Vectorization: TF-IDF using vectorizer.pkl
Models: Pretrained and loaded from /models directory
Prediction Response: Sent as JSON mapping each model to Fake/Real label

🌐 Hosting:
Backend hosted on Railway:
https://fakenewsdetectiobackend-production.up.railway.app/

Frontend sends POST requests to the backend to get prediction results
