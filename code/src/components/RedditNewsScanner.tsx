import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  MessageCircle,
  ExternalLink,
  RefreshCw,
  Shield,
  Eye,
  Clock,
} from "lucide-react";

interface RedditPost {
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

interface ScanResult {
  post_number: number;
  post: RedditPost;
  ml_predictions: { [model: string]: string };
  verdict: string;
  confidence: string;
  fake_count: number;
  real_count: number;
  reddit_analysis?: any;
  timestamp: string;
}

interface ScanResponse {
  subreddits: string[];
  posts: RedditPost[];
  total_found: number;
}

export function RedditNewsScanner() {
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [currentScan, setCurrentScan] = useState<RedditPost[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [selectedSubreddits, setSelectedSubreddits] = useState<string[]>([
    "news",
    "worldnews",
    "politics",
  ]);
  const [useRedditContext, setUseRedditContext] = useState<boolean>(true);
  const [scanLimit, setScanLimit] = useState<number>(10);

  const subredditOptions = [
    { value: "news", label: "r/news", description: "General news" },
    { value: "worldnews", label: "r/worldnews", description: "International news" },
    { value: "politics", label: "r/politics", description: "Political news" },
    // { value: "factcheck", label: "r/factcheck", description: "Fact-checking community" },
  ];

  const fetchHotPosts = async () => {
    try {
      console.log("Fetching hot posts from:", selectedSubreddits);
      const response = await fetch("http://localhost:5002/fetch-hot-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subreddits: selectedSubreddits,
          limit: scanLimit,
        }),
      });

      console.log("Response status:", response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Response error:", errorText);
        throw new Error(`Failed to fetch posts: ${response.status} ${errorText}`);
      }
      const data: ScanResponse = await response.json();
      console.log("Fetched posts:", data.posts.length);
      return data.posts;
    } catch (err) {
      console.error("Fetch error:", err);
      throw new Error(err instanceof Error ? err.message : "Error fetching Reddit posts");
    }
  };

  const analyzePost = async (post: RedditPost): Promise<ScanResult | null> => {
    const content = post.title + (post.selftext ? "\n\n" + post.selftext : "");

    try {
      const endpoint = useRedditContext ? "/fact-check" : "/predict";
      const response = await fetch(`http://localhost:5002${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });

      if (!response.ok) return null;
      const data = await response.json();

      const ml_predictions = data.ml_predictions || data;
      const fake_count = Object.values(ml_predictions).filter(
        (pred) => pred === "Fake"
      ).length;
      const real_count = Object.keys(ml_predictions).length - fake_count;

      const verdict = fake_count > real_count ? "🚨 LIKELY FAKE" : "✅ LIKELY REAL";
      const confidence = Math.abs(fake_count - real_count) >= 3 ? "High" : 
                        Math.abs(fake_count - real_count) >= 1 ? "Medium" : "Low";

      return {
        post_number: 0, // Will be set later
        post,
        ml_predictions,
        verdict,
        confidence,
        fake_count,
        real_count,
        reddit_analysis: data.combined_assessment || {},
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return null;
    }
  };

  const startScan = async () => {
    if (selectedSubreddits.length === 0) {
      setError("Please select at least one subreddit");
      return;
    }

    setLoading(true);
    setAnalyzing(false);
    setError(null);
    setScanResults([]);
    setCurrentScan([]);
    setProgress(0);

    try {
      // Test connection first
      const connectionOk = await testConnection();
      if (!connectionOk) {
        throw new Error("Backend connection failed. Please ensure the backend is running on http://localhost:5002");
      }

      // Fetch posts
      const posts = await fetchHotPosts();
      if (!posts || posts.length === 0) {
        setError("No posts found");
        return;
      }

      setCurrentScan(posts);
      setLoading(false);
      setAnalyzing(true);

      // Analyze each post
      const results: ScanResult[] = [];
      for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        const result = await analyzePost(post);
        
        if (result) {
          result.post_number = i + 1;
          results.push(result);
        }

        setProgress(((i + 1) / posts.length) * 100);
        setScanResults([...results]);

        // Small delay to be respectful to the API
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      setAnalyzing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
      setLoading(false);
      setAnalyzing(false);
    }
  };

  const testConnection = async () => {
    try {
      const response = await fetch("http://localhost:5002/");
      if (response.ok) {
        console.log("✅ Backend connection successful");
        return true;
      } else {
        console.error("❌ Backend responded with error:", response.status);
        return false;
      }
    } catch (err) {
      console.error("❌ Backend connection failed:", err);
      return false;
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

  const fakeNewsCount = scanResults.filter((r) => r.verdict.includes("FAKE")).length;
  const realNewsCount = scanResults.length - fakeNewsCount;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Control Panel */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Reddit News Scanner
        </h2>
        <p className="text-muted-foreground mb-6">
          Automatically scan hot posts from Reddit news subreddits and detect potential fake news using ML models.
        </p>

        <div className="space-y-6">
          {/* Subreddit Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Select Subreddits to Scan</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
  {subredditOptions.map((option) => {
    const isChecked = selectedSubreddits.includes(option.value);

    return (
      <button
        key={option.value}
        onClick={() => {
          if (isChecked) {
            setSelectedSubreddits(selectedSubreddits.filter((s) => s !== option.value));
          } else {
            setSelectedSubreddits([...selectedSubreddits, option.value]);
          }
        }}
        className={`group text-left p-4 rounded-xl border transition-all
          ${isChecked ? 
            "border-blue-600 bg-blue-50 dark:bg-blue-950/20 shadow-sm" : 
            "border-muted hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`h-5 w-5 rounded-md flex items-center justify-center border transition-all
              ${isChecked ? 
                "bg-blue-600 border-blue-600" : 
                "border-muted-foreground/40 group-hover:border-blue-400"
              }
            `}
          >
            {isChecked && (
              <CheckCircle className="h-4 w-4 text-white" />
            )}
          </div>

          <div>
            <p className="font-medium">{option.label}</p>
            <p className="text-xs text-muted-foreground">{option.description}</p>
          </div>
        </div>
      </button>
    );
  })}
</div>

          </div>

          {/* Options */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* <div className="flex items-center space-x-2">
              <Checkbox
                id="reddit-context"
                checked={useRedditContext}
                onCheckedChange={(checked) => setUseRedditContext(checked as boolean)}
              />
              <label htmlFor="reddit-context" className="text-sm font-medium">
                Include Reddit community analysis
              </label>
            </div> */}
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Posts to scan:</label>
              <select
                value={scanLimit}
                onChange={(e) => setScanLimit(Number(e.target.value))}
                className="px-3 py-1 border rounded text-sm"
              >
                <option value={5}>5 posts</option>
                <option value={10}>10 posts</option>
                <option value={15}>15 posts</option>
                <option value={20}>20 posts</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={async () => {
                const isConnected = await testConnection();
                if (isConnected) {
                  setError(null);
                  alert("✅ Backend connection successful!");
                } else {
                  setError("❌ Backend connection failed. Please ensure the backend is running on http://localhost:5002");
                }
              }}
              variant="outline"
              size="lg"
            >
              Test Connection
            </Button>
            
            <Button
              onClick={startScan}
              disabled={loading || analyzing}
              className="w-full sm:w-auto"
              size="lg"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Fetching Posts...
                </>
              ) : analyzing ? (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Analyzing... ({Math.round(progress)}%)
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Start Scan
                </>
              )}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive">{error}</p>
          </div>
        )}
      </Card>

      {/* Progress */}
      {analyzing && (
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-2">
                <span>Analyzing posts...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </div>
        </Card>
      )}

      {/* Results Summary */}
      {scanResults.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Scan Results Summary
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{scanResults.length}</div>
              <div className="text-sm text-muted-foreground">Posts Analyzed</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{realNewsCount}</div>
              <div className="text-sm text-muted-foreground">Likely Real</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">{fakeNewsCount}</div>
              <div className="text-sm text-muted-foreground">Likely Fake</div>
            </div>
          </div>

          {fakeNewsCount > 0 && (
            <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="font-semibold text-red-800 dark:text-red-200">
                  {fakeNewsCount} Potential Fake News Detected
                </span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">
                Review the flagged posts below for potential misinformation.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Detailed Results */}
      {scanResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Detailed Analysis</h3>
          
          {scanResults.map((result, index) => (
            <Card key={index} className="p-6">
              <div className="space-y-4">
                {/* Post Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">#{result.post_number}</Badge>
                      <Badge variant="outline">r/{result.post.subreddit}</Badge>
                      <Badge
                        variant={result.verdict.includes("FAKE") ? "destructive" : "default"}
                      >
                        {result.verdict}
                      </Badge>
                      <Badge variant="outline">{result.confidence} Confidence</Badge>
                    </div>
                    <h4 className="font-semibold text-lg mb-2">{result.post.title}</h4>
                    {result.post.selftext && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {result.post.selftext.substring(0, 200)}...
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {result.post.score}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {result.post.comments}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(result.post.created_utc)}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={result.post.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>

                {/* ML Analysis */}
                <div className="border-t pt-4">
                  <h5 className="font-medium mb-3">ML Model Predictions</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(result.ml_predictions).map(([model, prediction]) => (
                      <div key={model} className="text-center p-3 border rounded-lg">
                        <p className="font-medium text-sm">{model}</p>
                        <Badge
                          variant={prediction === "Fake" ? "destructive" : "default"}
                          className="mt-2"
                        >
                          {prediction === "Fake" ? "🚨 Fake" : "✅ Real"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">
                    Model consensus: {result.fake_count} predict fake, {result.real_count} predict real
                  </div>
                </div>

                {/* Reddit Analysis */}
                {useRedditContext && result.reddit_analysis && Object.keys(result.reddit_analysis).length > 0 && (
                  <div className="border-t pt-4">
                    <h5 className="font-medium mb-3">Reddit Community Analysis</h5>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      {result.reddit_analysis.reddit_verdict && (
                        <div>
                          <span className="font-medium">Community Verdict:</span>{" "}
                          {result.reddit_analysis.reddit_verdict}
                        </div>
                      )}
                      {result.reddit_analysis.reddit_score && (
                        <div>
                          <span className="font-medium">Credibility Score:</span>{" "}
                          {(result.reddit_analysis.reddit_score * 100).toFixed(0)}%
                        </div>
                      )}
                    </div>
                    {result.reddit_analysis.recommendation && (
                      <div className="mt-2 p-3 bg-muted/50 rounded text-sm">
                        {result.reddit_analysis.recommendation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}