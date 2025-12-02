import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ExternalLink,
  MessageCircle,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface RedditDiscussion {
  title: string;
  url: string;
  score: number;
  num_comments: number;
  subreddit: string;
  created_utc: number;
  selftext: string;
}

interface CredibilityAnalysis {
  credibility_score: number;
  signals: string[];
  discussion_count: number;
  avg_score: number;
  high_engagement_count: number;
}

interface CombinedAssessment {
  ml_verdict: string;
  ml_confidence: string;
  reddit_verdict: string;
  reddit_score: number;
  recommendation: string;
}

interface FactCheckResult {
  ml_predictions: { [model: string]: string };
  reddit_discussions: RedditDiscussion[];
  credibility_analysis: CredibilityAnalysis;
  combined_assessment: CombinedAssessment;
}

interface RedditUrlResult {
  reddit_post_info: {
    title: string;
    subreddit: string;
    score: number;
    num_comments: number;
    original_url: string;
  };
  extracted_content: string;
  ml_predictions: { [model: string]: string };
  analysis: {
    verdict: string;
    confidence: string;
    fake_predictions: number;
    real_predictions: number;
  };
}

export function RedditFactChecker() {
  const [newsInput, setNewsInput] = useState<string>("");
  const [result, setResult] = useState<FactCheckResult | null>(null);
  const [redditResult, setRedditResult] = useState<RedditUrlResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [includeReddit, setIncludeReddit] = useState<boolean>(true);
  const [isRedditUrl, setIsRedditUrl] = useState<boolean>(false);

  const handleFactCheck = async () => {
    if (!newsInput.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setRedditResult(null);

    // Check if input is a Reddit URL
    const isUrl = newsInput.includes('reddit.com');
    setIsRedditUrl(isUrl);

    try {
      if (isUrl) {
        // Handle Reddit URL
        const response = await fetch(`http://localhost:5002/analyze-reddit-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reddit_url: newsInput }),
        });

        if (!response.ok) throw new Error("Failed to analyze Reddit URL.");
        const data = await response.json();
        setRedditResult(data);
      } else {
        // Handle regular text analysis
        const endpoint = includeReddit ? "/fact-check" : "/predict";
        const response = await fetch(`http://localhost:5002${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: newsInput,
            include_reddit: includeReddit,
          }),
        });

        if (!response.ok) throw new Error("Failed to analyze news.");
        const data = await response.json();
        setResult(data);
      }
    } catch (err) {
      setError("Error analyzing content. Please try again.");
    } finally {
      setLoading(false);
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
          <MessageCircle className="h-6 w-6" />
          Reddit-Enhanced Fact Checker
        </h2>
        <p className="text-muted-foreground mb-6">
          Analyze news using ML models. Enter text or paste a Reddit URL to extract and analyze the content.
        </p>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="reddit-check"
              checked={includeReddit}
              onCheckedChange={(checked: boolean) =>
                setIncludeReddit(checked as boolean)
              }
            />
            <label htmlFor="reddit-check" className="text-sm font-medium">
              Include Reddit community analysis
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Enter news text or Reddit URL (e.g., https://reddit.com/r/news/comments/...)"
              value={newsInput}
              onChange={(e) => setNewsInput(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleFactCheck} disabled={loading}>
              {loading ? "Analyzing..." : "Fact Check"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive">{error}</p>
          </div>
        )}
      </Card>

      {/* Reddit URL Results */}
      {redditResult && (
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Reddit Post Analysis
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">{redditResult.reddit_post_info.title}</h4>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <span>r/{redditResult.reddit_post_info.subreddit}</span>
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {redditResult.reddit_post_info.score}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" />
                    {redditResult.reddit_post_info.num_comments}
                  </span>
                </div>
                {redditResult.reddit_post_info.original_url && (
                  <div className="mb-3">
                    <span className="text-sm font-medium">Linked Article: </span>
                    <a 
                      href={redditResult.reddit_post_info.original_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {redditResult.reddit_post_info.original_url}
                    </a>
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium">Extracted Content: </span>
                  <p className="text-sm mt-1">{redditResult.extracted_content}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">ML Analysis:</span>
                    <Badge variant={redditResult.analysis.verdict.includes('Fake') ? 'destructive' : 'default'}>
                      {redditResult.analysis.verdict}
                    </Badge>
                    <Badge variant="outline">{redditResult.analysis.confidence} Confidence</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {redditResult.analysis.fake_predictions} models predict fake, {redditResult.analysis.real_predictions} predict real
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(redditResult.ml_predictions).map(([model, prediction]) => (
                  <div key={model} className="text-center p-3 border rounded-lg">
                    <p className="font-medium text-sm">{model}</p>
                    <Badge 
                      variant={prediction === 'Fake' ? 'destructive' : 'default'}
                      className="mt-2"
                    >
                      {prediction}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Combined Assessment */}
          {result.combined_assessment && (
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Assessment Summary
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">ML Verdict:</span>
                    <Badge
                      variant={
                        result.combined_assessment.ml_verdict.includes("Fake")
                          ? "destructive"
                          : "default"
                      }
                    >
                      {result.combined_assessment.ml_verdict}
                    </Badge>
                    <Badge variant="outline">
                      {result.combined_assessment.ml_confidence} Confidence
                    </Badge>
                  </div>
                  {includeReddit && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Reddit Analysis:</span>
                      <Badge
                        variant={
                          result.combined_assessment.reddit_score > 0.6
                            ? "default"
                            : "secondary"
                        }
                      >
                        {result.combined_assessment.reddit_verdict}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        (
                        {(
                          result.combined_assessment.reddit_score * 100
                        ).toFixed(0)}
                        % credible)
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm">
                  {result.combined_assessment.recommendation}
                </p>
              </div>
            </Card>
          )}

          {/* ML Predictions */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">ML Model Predictions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(result.ml_predictions).map(
                ([model, prediction]) => (
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
          </Card>

          {/* Reddit Analysis */}
          {includeReddit && result.reddit_discussions && (
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Reddit Community Discussions
              </h3>

              {result.credibility_analysis && (
                <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Discussions Found:</span>{" "}
                      {result.credibility_analysis.discussion_count}
                    </div>
                    <div>
                      <span className="font-medium">Avg Score:</span>{" "}
                      {result.credibility_analysis.avg_score.toFixed(1)}
                    </div>
                    <div>
                      <span className="font-medium">High Engagement:</span>{" "}
                      {result.credibility_analysis.high_engagement_count}
                    </div>
                  </div>
                  {result.credibility_analysis.signals.length > 0 && (
                    <div className="mt-3">
                      <p className="font-medium text-sm mb-2">
                        Credibility Signals:
                      </p>
                      <ul className="text-sm space-y-1">
                        {result.credibility_analysis.signals.map(
                          (signal, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 mt-0.5 text-yellow-500 flex-shrink-0" />
                              {signal}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                {result.reddit_discussions
                  .slice(0, 5)
                  .map((discussion, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-medium mb-2">
                            {discussion.title}
                          </h4>
                          {discussion.selftext && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {discussion.selftext.substring(0, 200)}...
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>r/{discussion.subreddit}</span>
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {discussion.score}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" />
                              {discussion.num_comments}
                            </span>
                            <span>{formatTimeAgo(discussion.created_utc)}</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={discussion.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
