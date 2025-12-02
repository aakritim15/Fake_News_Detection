import praw
import os
import logging
from typing import List, Dict, Optional
import re
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class RedditFactChecker:
    def __init__(self):
        try:
            # Initialize Reddit client with proper credentials
            self.reddit = praw.Reddit(
                client_id=os.getenv("REDDIT_CLIENT_ID"),
                client_secret=os.getenv(
                    "REDDIT_CLIENT_SECRET"
                ),
                username=os.getenv("REDDIT_USERNAME"),
                password=os.getenv("REDDIT_PASSWORD"),
                user_agent=os.getenv(
                    "REDDIT_USER_AGENT", "FakeNewsDetector/1.0 by Intelligent-Sky-417"
                ),
            )
            # Test the connection
            self.reddit.user.me()
            logger.info("Reddit API connection successful")
        except Exception as e:
            logger.warning(
                f"Reddit API connection failed: {e}. Running without Reddit integration."
            )
            self.reddit = None

    def fetch_news_posts(self, query: str, limit: int = 20) -> List[Dict]:
        """Fetch news posts from Reddit based on search query"""
        if not self.reddit:
            return []

        subs = ["news", "worldnews", "politics", "factcheck"]
        posts = []

        for sub in subs:
            try:
                subreddit = self.reddit.subreddit(sub)
                posts_per_sub = limit // len(subs)

                for submission in subreddit.search(
                    query, sort="relevance", limit=posts_per_sub
                ):
                    posts.append(
                        {
                            "id": submission.id,
                            "title": submission.title,
                            "url": submission.url,
                            "score": submission.score,
                            "comments": submission.num_comments,
                            "subreddit": sub,
                            "selftext": submission.selftext[:500]
                            if submission.selftext
                            else "",
                            "created_utc": submission.created_utc,
                            "permalink": f"https://reddit.com{submission.permalink}",
                        }
                    )
            except Exception as e:
                logger.warning(f"Error fetching from subreddit {sub}: {e}")
                continue

        # Sort by score (popularity) and return
        return sorted(posts, key=lambda x: x["score"], reverse=True)

    def fetch_hot_posts(self, subreddits: List[str], limit: int = 10) -> List[Dict]:
        """Fetch hot posts from specified subreddits"""
        if not self.reddit:
            return []

        posts = []
        # Request more posts per subreddit to account for filtering
        posts_per_sub = max(1, (limit // len(subreddits)) + 2)

        for sub_name in subreddits:
            try:
                subreddit = self.reddit.subreddit(sub_name)
                count = 0

                for submission in subreddit.hot(limit=posts_per_sub * 2):
                    # Skip stickied posts as they're often announcements
                    if submission.stickied:
                        continue
                    
                    posts.append(
                        {
                            "id": submission.id,
                            "title": submission.title,
                            "url": submission.url,
                            "score": submission.score,
                            "comments": submission.num_comments,
                            "subreddit": sub_name,
                            "selftext": submission.selftext[:500]
                            if submission.selftext
                            else "",
                            "created_utc": submission.created_utc,
                            "permalink": f"https://reddit.com{submission.permalink}",
                        }
                    )
                    
                    count += 1
                    if count >= posts_per_sub:
                        break

            except Exception as e:
                logger.warning(f"Error fetching hot posts from r/{sub_name}: {e}")
                continue

        # Sort by score and return exactly the requested limit
        return sorted(posts, key=lambda x: x["score"], reverse=True)[:limit]

    def search_related_discussions(self, text: str, limit: int = 10) -> List[Dict]:
        """Search for related discussions on Reddit based on text content"""
        if not self.reddit:
            return []

        # Extract key terms from the text for search
        search_terms = self._extract_search_terms(text)
        discussions = []

        subs = ["news", "worldnews", "politics", "factcheck", "skeptic"]

        for term in search_terms[:3]:  # Use top 3 search terms
            for sub in subs:
                try:
                    subreddit = self.reddit.subreddit(sub)
                    for submission in subreddit.search(term, sort="relevance", limit=2):
                        discussions.append(
                            {
                                "title": submission.title,
                                "url": f"https://reddit.com{submission.permalink}",
                                "score": submission.score,
                                "num_comments": submission.num_comments,
                                "subreddit": sub,
                                "created_utc": submission.created_utc,
                                "selftext": submission.selftext[:300]
                                if submission.selftext
                                else "",
                            }
                        )
                except Exception as e:
                    logger.warning(f"Error searching {sub} for '{term}': {e}")
                    continue

        # Remove duplicates and sort by score
        seen_urls = set()
        unique_discussions = []
        for disc in discussions:
            if disc["url"] not in seen_urls:
                seen_urls.add(disc["url"])
                unique_discussions.append(disc)

        return sorted(unique_discussions, key=lambda x: x["score"], reverse=True)[
            :limit
        ]

    def analyze_credibility_signals(self, discussions: List[Dict]) -> Dict:
        """Analyze credibility signals from Reddit discussions"""
        if not discussions:
            return {
                "credibility_score": 0.5,
                "signals": ["No related discussions found"],
                "discussion_count": 0,
                "avg_score": 0,
                "high_engagement_count": 0,
            }

        total_score = sum(d["score"] for d in discussions)
        avg_score = total_score / len(discussions) if discussions else 0
        high_engagement = [
            d for d in discussions if d["score"] > 100 or d["num_comments"] > 50
        ]

        signals = []
        credibility_score = 0.5  # Base score

        # Analyze engagement patterns
        if avg_score > 500:
            signals.append("High community engagement suggests topic relevance")
            credibility_score += 0.2
        elif avg_score < 10:
            signals.append("Low engagement may indicate limited community interest")
            credibility_score -= 0.1

        # Check for fact-checking subreddits
        factcheck_discussions = [
            d for d in discussions if d["subreddit"] in ["factcheck", "skeptic"]
        ]
        if factcheck_discussions:
            signals.append("Found discussions in fact-checking communities")
            credibility_score += 0.1

        # Check discussion diversity
        unique_subreddits = len(set(d["subreddit"] for d in discussions))
        if unique_subreddits > 3:
            signals.append("Topic discussed across multiple communities")
            credibility_score += 0.1

        # Ensure score stays within bounds
        credibility_score = max(0.0, min(1.0, credibility_score))

        return {
            "credibility_score": credibility_score,
            "signals": signals,
            "discussion_count": len(discussions),
            "avg_score": avg_score,
            "high_engagement_count": len(high_engagement),
        }

    def is_reddit_url(self, url: str) -> bool:
        """Check if the provided URL is a valid Reddit URL"""
        reddit_patterns = [
            r"https?://(?:www\.)?reddit\.com/r/\w+/comments/\w+",
            r"https?://(?:www\.)?reddit\.com/r/\w+/comments/\w+/.*",
            r"https?://redd\.it/\w+",
        ]
        return any(re.match(pattern, url) for pattern in reddit_patterns)

    def extract_content_from_reddit_url(self, reddit_url: str) -> Dict:
        """Extract content from a Reddit URL for analysis"""
        try:
            # Extract submission ID from URL
            submission_id = self._extract_submission_id(reddit_url)
            if not submission_id:
                return {"error": "Could not extract submission ID from URL"}

            # Get submission
            submission = self.reddit.submission(id=submission_id)

            # Extract content
            content_parts = [submission.title]
            if submission.selftext:
                content_parts.append(submission.selftext)

            # If it's a link post, try to get the linked content title
            if submission.url and not submission.is_self:
                content_parts.append(f"Linked article: {submission.url}")

            extracted_content = " ".join(content_parts)

            return {
                "title": submission.title,
                "subreddit": submission.subreddit.display_name,
                "score": submission.score,
                "num_comments": submission.num_comments,
                "url": submission.url if not submission.is_self else "",
                "extracted_content": extracted_content,
                "created_utc": submission.created_utc,
            }

        except Exception as e:
            logger.error(f"Error extracting content from Reddit URL: {e}")
            return {"error": f"Failed to extract content: {str(e)}"}

    def _extract_search_terms(self, text: str) -> List[str]:
        """Extract key search terms from text"""
        # Simple keyword extraction - remove common words and get meaningful terms
        stop_words = {
            "the",
            "a",
            "an",
            "and",
            "or",
            "but",
            "in",
            "on",
            "at",
            "to",
            "for",
            "of",
            "with",
            "by",
            "is",
            "are",
            "was",
            "were",
            "be",
            "been",
            "being",
            "have",
            "has",
            "had",
            "do",
            "does",
            "did",
            "will",
            "would",
            "could",
            "should",
            "may",
            "might",
            "must",
            "can",
            "this",
            "that",
            "these",
            "those",
        }

        # Clean and split text
        words = re.findall(r"\b[a-zA-Z]{3,}\b", text.lower())
        keywords = [word for word in words if word not in stop_words]

        # Get most frequent terms (simple frequency count)
        word_freq = {}
        for word in keywords:
            word_freq[word] = word_freq.get(word, 0) + 1

        # Return top terms
        sorted_terms = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        return [term[0] for term in sorted_terms[:5]]

    def _extract_submission_id(self, reddit_url: str) -> Optional[str]:
        """Extract Reddit submission ID from URL"""
        patterns = [r"reddit\.com/r/\w+/comments/(\w+)", r"redd\.it/(\w+)"]

        for pattern in patterns:
            match = re.search(pattern, reddit_url)
            if match:
                return match.group(1)

        return None
