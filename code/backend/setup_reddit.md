# Reddit API Setup Instructions

## 1. Get Reddit API Credentials

1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Fill in the form:
   - **Name**: Fake News Detector
   - **App type**: Select "script"
   - **Description**: ML-powered fake news detection with Reddit fact-checking
   - **About URL**: (leave blank)
   - **Redirect URI**: http://localhost:8080 (required but not used)
4. Click "Create app"
5. Note down:
   - **Client ID**: The string under your app name
   - **Client Secret**: The "secret" field

## 2. Create Environment File

Create a `.env` file in the `code/backend` directory:

```bash
# Reddit API Credentials
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
REDDIT_USER_AGENT=FakeNewsDetector/1.0

# Flask Configuration
FLASK_ENV=development
PORT=5000
```

## 3. Install Dependencies

```bash
cd code/backend
pip install -r requirements.txt
```

## 4. Test the Integration

Run the Flask app:
```bash
python app.py
```

Test the new endpoint:
```bash
curl -X POST http://localhost:5000/fact-check \
  -H "Content-Type: application/json" \
  -d '{"text": "Breaking: Scientists discover new planet in our solar system"}'
```

## 5. Frontend Usage

The new Reddit Fact Checker tab allows users to:
- Toggle Reddit analysis on/off
- Get ML predictions combined with Reddit community discussions
- See credibility scores based on Reddit engagement
- View related discussions from news subreddits

## API Endpoints

- `POST /predict` - Original ML prediction (with optional `include_reddit: true`)
- `POST /fact-check` - Combined ML + Reddit analysis
- Both endpoints accept: `{"text": "news article text", "include_reddit": true}`