import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  ExternalLink,
  MessageCircle,
  TrendingUp,
  Clock,
} from "lucide-react";

interface NewsPost {
  id: string;
  title: string;
  url: string;
  score: number;
  comments: number;
  subreddit: string;
  selftext: string;
  created_utc: number;
  permalink: string;
}

interface NewsResponse {
  query: string;
  posts: NewsPost[];
  total_found: number;
}

export function NewsFetcher() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [newsData, setNewsData] = useState<NewsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedPost, setSelectedPost] = useState<NewsPost | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState<boolean>(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setNewsData(null);

    try {
      const response = await fetch("http://localhost:5002/fetch-news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          limit: 20,
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch news.");
      const data = await response.json();
      setNewsData(data);
    } catch (err) {
      setError("Error fetching news. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const analyzePost = async (post: NewsPost) => {
    setAnalyzing(true);
    setSelectedPost(post);
    setAnalysisResult(null);

    try {
      // Use the existing ML prediction endpoint with the post content
      const textToAnalyze =
        post.title + (post.selftext ? "\n\n" + post.selftext : "");

      const response = await fetch("http://localhost:5002/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToAnalyze }),
      });

      if (!response.ok) throw new Error("Failed to analyze post.");
      const data = await response.json();

      // Format the result to match our interface
      const fakeCount = Object.values(data.ml_predictions || data).filter(
        (pred) => pred === "Fake"
      ).length;
      const realCount =
        Object.keys(data.ml_predictions || data).length - fakeCount;

      setAnalysisResult({
        ml_predictions: data.ml_predictions || data,
        analysis: {
          verdict: fakeCount > realCount ? "Likely Fake" : "Likely Real",
          confidence:
            Math.abs(fakeCount - realCount) >= 3
              ? "High"
              : Math.abs(fakeCount - realCount) >= 1
              ? "Medium"
              : "Low",
          fake_predictions: fakeCount,
          real_predictions: realCount,
        },
        analyzed_text: textToAnalyze,
      });
    } catch (err) {
      setError("Error analyzing post. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    const days = Math.floor(diff / 86400);
    if (days > 0) return `${days}d ago`;
    const hours = Math.floor(diff / 3600);
    if (hours > 0) return `${hours}h ago`;
    const minutes = Math.floor(diff / 60);
    return `${minutes}m ago`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Search className="h-6 w-6" />
          Live News Fetcher & Analyzer
        </h2>
        <p className="text-muted-foreground mb-6">
          Search for news topics across Reddit and analyze posts for fake news
          detection.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Search for news topics (e.g., 'climate change', 'election', 'technology')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? "Searching..." : "Search News"}
          </Button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive">{error}</p>
          </div>
        )}
      </Card>

      {newsData && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">
            Search Results for "{newsData.query}" ({newsData.total_found} posts
            found)
          </h3>

          <div className="space-y-4">
            {newsData.posts.map((post) => (
              <div
                key={post.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-medium mb-2 line-clamp-2">
                      {post.title}
                    </h4>
                    {post.selftext && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {post.selftext}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="font-medium">r/{post.subreddit}</span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {post.score}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {post.comments}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(post.created_utc)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => analyzePost(post)}
                      disabled={analyzing}
                    >
                      {analyzing && selectedPost?.id === post.id
                        ? "Analyzing..."
                        : "Analyze"}
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {analysisResult && selectedPost && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">
            Analysis Results for: {selectedPost.title}
          </h3>

          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">ML Analysis:</span>
                <Badge
                  variant={
                    analysisResult.analysis.verdict.includes("Fake")
                      ? "destructive"
                      : "default"
                  }
                >
                  {analysisResult.analysis.verdict}
                </Badge>
                <Badge variant="outline">
                  {analysisResult.analysis.confidence} Confidence
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {analysisResult.analysis.fake_predictions} models predict fake,{" "}
                {analysisResult.analysis.real_predictions} predict real
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(analysisResult.ml_predictions).map(
                ([model, prediction]: [string, any]) => (
                  <div
                    key={model}
                    className="text-center p-3 border rounded-lg"
                  >
                    <p className="font-medium text-sm">{model}</p>
                    <Badge
                      variant={
                        prediction === "Fake" ? "destructive" : "default"
                      }
                      className="mt-2"
                    >
                      {prediction}
                    </Badge>
                  </div>
                )
              )}
            </div>

            {analysisResult.analyzed_text && (
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Analyzed Content:</h4>
                <p className="text-sm">
                  {analysisResult.analyzed_text.substring(0, 500)}...
                </p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
