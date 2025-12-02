#!/usr/bin/env python3
"""
Reddit Fake News Scanner - Scan Reddit news and detect fake news using your trained ML models
"""

import requests
import json
import time
from datetime import datetime
from typing import List, Dict

class RedditFakeNewsScanner:
    def __init__(self, backend_url="http://localhost:5002"):
        self.backend_url = backend_url
        
    def test_backend_connection(self):
        """Test if the backend is running"""
        try:
            response = requests.get(f"{self.backend_url}/")
            return response.status_code == 200
        except:
            return False
    
    def fetch_hot_news_posts(self, subreddits=None, limit=15):
        """Fetch hot posts from news subreddits"""
        if subreddits is None:
            subreddits = ["news", "worldnews", "politics"]
        
        try:
            response = requests.post(
                f"{self.backend_url}/fetch-hot-posts",
                json={"subreddits": subreddits, "limit": limit},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Error fetching hot posts: {response.status_code}")
                return None
        except Exception as e:
            print(f"Error: {e}")
            return None
    
    def analyze_post_with_ml(self, post):
        """Analyze a Reddit post using the ML models"""
        # Combine title and selftext for analysis
        content = post['title']
        if post.get('selftext'):
            content += "\n\n" + post['selftext']
        
        try:
            response = requests.post(
                f"{self.backend_url}/predict",
                json={"text": content},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Error analyzing post: {response.status_code}")
                return None
        except Exception as e:
            print(f"Error analyzing: {e}")
            return None
    
    def analyze_with_reddit_context(self, post):
        """Analyze post with Reddit community context"""
        content = post['title']
        if post.get('selftext'):
            content += "\n\n" + post['selftext']
        
        try:
            response = requests.post(
                f"{self.backend_url}/fact-check",
                json={"text": content},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return None
        except Exception as e:
            return None
    
    def calculate_verdict(self, ml_predictions):
        """Calculate overall verdict from ML predictions"""
        if not ml_predictions:
            return "Unknown", "Low", 0, 0
        
        fake_count = sum(1 for pred in ml_predictions.values() if pred == "Fake")
        real_count = len(ml_predictions) - fake_count
        
        if fake_count > real_count:
            verdict = "🚨 LIKELY FAKE"
            confidence = "High" if fake_count >= 3 else "Medium"
        else:
            verdict = "✅ LIKELY REAL"
            confidence = "High" if real_count >= 3 else "Medium"
        
        return verdict, confidence, fake_count, real_count
    
    def scan_reddit_news(self, subreddits=None, limit=10, use_reddit_context=True):
        """Main function to scan Reddit news and detect fake news"""
        if subreddits is None:
            subreddits = ["news", "worldnews", "politics"]
        
        print("🔍 Reddit Fake News Scanner")
        print("=" * 60)
        print(f"Using your trained ML models: Logistic Regression, Naive Bayes, Random Forest, Gradient Boosting")
        print("=" * 60)
        
        # Test backend connection
        if not self.test_backend_connection():
            print("❌ Backend not available. Please start the Flask app.")
            return []
        
        print("✅ Backend connected successfully")
        print(f"📡 Fetching hot posts from: {', '.join([f'r/{sub}' for sub in subreddits])}")
        print()
        
        # Fetch hot posts
        news_data = self.fetch_hot_news_posts(subreddits, limit)
        if not news_data or not news_data.get('posts'):
            print("❌ No posts found")
            return []
        
        posts = news_data['posts']
        print(f"📰 Found {len(posts)} posts to analyze")
        print()
        
        results = []
        fake_news_detected = []
        
        for i, post in enumerate(posts, 1):
            print(f"🔎 Analyzing Post {i}/{len(posts)}")
            print(f"   Title: {post['title'][:80]}...")
            print(f"   Subreddit: r/{post['subreddit']} | Score: {post['score']} | Comments: {post['comments']}")
            
            # Analyze with ML models
            if use_reddit_context:
                analysis = self.analyze_with_reddit_context(post)
                if analysis and 'ml_predictions' in analysis:
                    ml_predictions = analysis['ml_predictions']
                    reddit_analysis = analysis.get('combined_assessment', {})
                else:
                    # Fallback to basic ML analysis
                    basic_analysis = self.analyze_post_with_ml(post)
                    ml_predictions = basic_analysis.get('ml_predictions', basic_analysis) if basic_analysis else {}
                    reddit_analysis = {}
            else:
                basic_analysis = self.analyze_post_with_ml(post)
                ml_predictions = basic_analysis.get('ml_predictions', basic_analysis) if basic_analysis else {}
                reddit_analysis = {}
            
            if ml_predictions:
                verdict, confidence, fake_count, real_count = self.calculate_verdict(ml_predictions)
                
                print(f"   🤖 ML Analysis: {verdict} (Confidence: {confidence})")
                print(f"   📊 Model Votes - Fake: {fake_count}, Real: {real_count}")
                
                if reddit_analysis:
                    reddit_verdict = reddit_analysis.get('reddit_verdict', 'N/A')
                    reddit_score = reddit_analysis.get('reddit_score', 0)
                    print(f"   🗣️  Reddit Community: {reddit_verdict} ({reddit_score*100:.0f}% credible)")
                
                # Store result
                result = {
                    'post_number': i,
                    'post': post,
                    'ml_predictions': ml_predictions,
                    'verdict': verdict,
                    'confidence': confidence,
                    'fake_count': fake_count,
                    'real_count': real_count,
                    'reddit_analysis': reddit_analysis,
                    'timestamp': datetime.now().isoformat()
                }
                results.append(result)
                
                # Track potential fake news
                if "FAKE" in verdict:
                    fake_news_detected.append(result)
                
            else:
                print(f"   ❌ Analysis failed")
            
            print(f"   🔗 Link: {post['permalink']}")
            print()
            
            # Small delay to be respectful
            time.sleep(0.5)
        
        # Summary
        print("📊 SCAN SUMMARY")
        print("=" * 60)
        print(f"Total posts analyzed: {len(results)}")
        print(f"Likely real news: {len([r for r in results if 'REAL' in r['verdict']])}")
        print(f"Likely fake news: {len(fake_news_detected)}")
        
        if fake_news_detected:
            print(f"\n🚨 POTENTIAL FAKE NEWS DETECTED ({len(fake_news_detected)} posts):")
            print("=" * 60)
            
            for result in fake_news_detected:
                post = result['post']
                print(f"🔴 {post['title']}")
                print(f"   Subreddit: r/{post['subreddit']} | Score: {post['score']} | Comments: {post['comments']}")
                print(f"   Confidence: {result['confidence']} | ML Votes - Fake: {result['fake_count']}, Real: {result['real_count']}")
                print(f"   Link: {post['permalink']}")
                
                # Show individual model predictions
                print(f"   Model Predictions:")
                for model, prediction in result['ml_predictions'].items():
                    emoji = "🚨" if prediction == "Fake" else "✅"
                    print(f"     {emoji} {model}: {prediction}")
                print()
        else:
            print("\n✅ No fake news detected in this scan!")
        
        return results

def main():
    scanner = RedditFakeNewsScanner()
    
    print("🎯 Reddit Fake News Detection System")
    print("Using your pre-trained ML models to scan live Reddit news")
    print()
    
    # Scan different combinations
    print("🔍 SCANNING GENERAL NEWS...")
    results1 = scanner.scan_reddit_news(
        subreddits=["news", "worldnews"], 
        limit=8, 
        use_reddit_context=True
    )
    
    print("\n" + "="*80 + "\n")
    
    print("🔍 SCANNING POLITICAL NEWS...")
    results2 = scanner.scan_reddit_news(
        subreddits=["politics"], 
        limit=5, 
        use_reddit_context=True
    )
    
    # Combine results
    all_results = results1 + results2
    
    # Save results
    if all_results:
        filename = f"reddit_fake_news_scan_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(filename, 'w') as f:
            json.dump(all_results, f, indent=2, default=str)
        print(f"\n📁 Detailed results saved to '{filename}'")
    
    print(f"\n🎉 Scan complete! Analyzed {len(all_results)} posts total.")

if __name__ == "__main__":
    main()