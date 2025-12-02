#!/usr/bin/env python3
"""
Reddit News Scanner - Automatically scan Reddit news and detect fake news
"""

import requests
import json
import time
from datetime import datetime

class RedditNewsScanner:
    def __init__(self, backend_url="http://localhost:5002"):
        self.backend_url = backend_url
        
    def test_backend_connection(self):
        """Test if the backend is running"""
        try:
            response = requests.get(f"{self.backend_url}/")
            return response.status_code == 200
        except:
            return False
    
    def fetch_reddit_news(self, query="breaking news", limit=10):
        """Fetch news posts from Reddit"""
        try:
            response = requests.post(
                f"{self.backend_url}/fetch-news",
                json={"query": query, "limit": limit},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Error fetching news: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"Error: {e}")
            return None
    
    def fetch_hot_posts(self, subreddits=None, limit=5):
        """Fetch hot posts directly from news subreddits"""
        if subreddits is None:
            subreddits = ["news", "worldnews", "politics"]
        
        all_posts = []
        
        for subreddit in subreddits:
            try:
                # Use a simple GET request to test the backend
                response = requests.get(f"{self.backend_url}/")
                if response.status_code != 200:
                    continue
                    
                # For now, let's create a mock request to get hot posts
                # We'll modify this to use a new endpoint
                print(f"   Fetching from r/{subreddit}...")
                
            except Exception as e:
                print(f"Error fetching from r/{subreddit}: {e}")
                continue
        
        return all_posts
    
    def analyze_post_content(self, post):
        """Analyze a Reddit post for fake news"""
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
    
    def scan_and_analyze(self, queries=None, posts_per_query=5):
        """Main function to scan Reddit and analyze posts"""
        if queries is None:
            queries = [
                "breaking news",
                "politics news", 
                "world news",
                "election news",
                "covid news"
            ]
        
        print("🔍 Reddit News Scanner - Fake News Detection")
        print("=" * 50)
        
        # Test backend connection
        if not self.test_backend_connection():
            print("❌ Backend not available. Please start the Flask app.")
            return
        
        print("✅ Backend connected successfully")
        print()
        
        all_results = []
        
        for query in queries:
            print(f"🔎 Searching for: '{query}'")
            
            # Fetch posts
            news_data = self.fetch_reddit_news(query, posts_per_query)
            if not news_data or not news_data.get('posts'):
                print(f"   No posts found for '{query}'")
                continue
            
            posts = news_data['posts']
            print(f"   Found {len(posts)} posts")
            
            for i, post in enumerate(posts, 1):
                print(f"\n   📰 Post {i}: {post['title'][:60]}...")
                print(f"      Subreddit: r/{post['subreddit']} | Score: {post['score']} | Comments: {post['comments']}")
                
                # Analyze the post
                analysis = self.analyze_post_content(post)
                if analysis:
                    ml_predictions = analysis.get('ml_predictions', analysis)
                    
                    # Count predictions
                    fake_count = sum(1 for pred in ml_predictions.values() if pred == "Fake")
                    real_count = len(ml_predictions) - fake_count
                    
                    # Determine overall verdict
                    if fake_count > real_count:
                        verdict = "🚨 LIKELY FAKE"
                        confidence = "High" if fake_count >= 3 else "Medium"
                    else:
                        verdict = "✅ LIKELY REAL"
                        confidence = "High" if real_count >= 3 else "Medium"
                    
                    print(f"      Analysis: {verdict} (Confidence: {confidence})")
                    print(f"      Models - Fake: {fake_count}, Real: {real_count}")
                    
                    # Store result
                    result = {
                        'query': query,
                        'post': post,
                        'analysis': analysis,
                        'verdict': verdict,
                        'confidence': confidence,
                        'fake_count': fake_count,
                        'real_count': real_count,
                        'timestamp': datetime.now().isoformat()
                    }
                    all_results.append(result)
                else:
                    print(f"      ❌ Analysis failed")
                
                # Small delay to be respectful
                time.sleep(0.5)
            
            print()
        
        # Summary
        print("📊 SCAN SUMMARY")
        print("=" * 50)
        
        if all_results:
            fake_posts = [r for r in all_results if "FAKE" in r['verdict']]
            real_posts = [r for r in all_results if "REAL" in r['verdict']]
            
            print(f"Total posts analyzed: {len(all_results)}")
            print(f"Likely fake news: {len(fake_posts)}")
            print(f"Likely real news: {len(real_posts)}")
            
            if fake_posts:
                print(f"\n🚨 POTENTIAL FAKE NEWS DETECTED:")
                for result in fake_posts:
                    post = result['post']
                    print(f"   • {post['title'][:80]}...")
                    print(f"     r/{post['subreddit']} | {result['confidence']} confidence")
                    print(f"     Link: {post['permalink']}")
                    print()
        else:
            print("No posts were successfully analyzed.")
        
        return all_results

def main():
    scanner = RedditNewsScanner()
    
    # You can customize the search queries here
    custom_queries = [
        "breaking news",
        "election fraud", 
        "vaccine news",
        "climate change",
        "artificial intelligence"
    ]
    
    results = scanner.scan_and_analyze(custom_queries, posts_per_query=3)
    
    # Optionally save results to file
    if results:
        with open('reddit_scan_results.json', 'w') as f:
            json.dump(results, f, indent=2, default=str)
        print(f"📁 Results saved to 'reddit_scan_results.json'")

if __name__ == "__main__":
    main()