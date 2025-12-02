import { ThemeProvider } from '@/components/theme-provider';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NewspaperIcon, BrainCircuitIcon, GamepadIcon, TrophyIcon, Zap } from 'lucide-react';
import { useState } from 'react';
import { FakeNewsQuiz } from '@/components/FakeNewsQuiz';
import { SpeedChallenge } from '@/components/SpeedChallenge';
import { Leaderboard } from '@/components/Leaderboard';
import { ModelComparison } from '@/components/ModelComparison';
import { RedditNewsScanner } from '@/components/RedditNewsScanner';

// Define interfaces
interface PredictionResult {
  [model: string]: string;
}

type GameType = 'quiz' | 'speed' | 'leaderboard' | null;

function App() {
  const [newsInput, setNewsInput] = useState<string>('');
  const [predictions, setPredictions] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentGame, setCurrentGame] = useState<GameType>(null);
  
  const handleAnalyze = async () => {
    if (!newsInput.trim()) return;
    setLoading(true);
    setError(null);
    setPredictions(null);

    try {
      const response = await fetch('http://localhost:5002/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newsInput }),
      });
      if (!response.ok) throw new Error('Failed to analyze news.');
      const data = await response.json();
      // Handle both direct predictions and nested ml_predictions
      const predictions = data.ml_predictions || data;
      setPredictions(predictions);
    } catch (err) {
      setError('Error analyzing news. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider defaultTheme="system" storageKey="fake-news-theme">
      <div className="min-h-screen w-full flex flex-col bg-background text-foreground">
        <header className="border-b w-full">
          <div className="container mx-auto px-6 py-6 flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
              <NewspaperIcon className="h-8 w-8" />
              <h1 className="text-2xl font-bold">Reddit News Check</h1>
            </div>
            <ModeToggle />
          </div>
        </header>

        <main className="flex-1 w-full px-4 py-8">
          <div className="container mx-auto max-w-7xl">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h2 className="text-4xl sm:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AI-Powered Fake News Detection
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Analyze news articles using advanced machine learning models and Reddit community insights
              </p>
            </div>

            {/* Quick Analysis Card */}
            <Card className="p-8 mb-8 shadow-lg border-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <BrainCircuitIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Quick Analysis</h3>
                  <p className="text-sm text-muted-foreground">Paste any news article for instant verification</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Input
                  placeholder="Paste news article or headline here..."
                  value={newsInput}
                  onChange={(e) => setNewsInput(e.target.value)}
                  className="flex-1 text-base p-6 border-2 focus:border-blue-500"
                />
                <Button 
                  className="w-full sm:w-auto text-base px-8 py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700" 
                  onClick={handleAnalyze} 
                  disabled={loading}
                >
                  {loading ? 'Analyzing...' : 'Analyze Now'}
                </Button>
              </div>
              
              {error && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 border-2 border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
                </div>
              )}
              
              {predictions && typeof predictions === 'object' && (
                <div className="mt-6 p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-2 rounded-xl">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <span className="text-2xl">🤖</span>
                    ML Model Predictions
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(predictions).map(([model, result]) => (
                      <div key={model} className="flex justify-between items-center p-4 bg-white dark:bg-slate-950 rounded-lg border-2 hover:shadow-md transition-shadow">
                        <span className="font-semibold text-base">{model}</span>
                        <span
                          className={`px-4 py-2 rounded-full text-sm font-bold ${
                            String(result) === "Real"
                              ? "bg-green-100 text-green-700 border-2 border-green-500 dark:bg-green-950 dark:text-green-400"
                              : "bg-red-100 text-red-700 border-2 border-red-500 dark:bg-red-950 dark:text-red-400"
                          }`}
                        >
                          {String(result) === "Real" ? "✅ Real" : "🚨 Fake"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Feature Tabs */}
            <Tabs defaultValue="scanner" className="mb-8">
              <TabsList className="grid w-full grid-cols-3 gap-2 p-2 bg-slate-100 dark:bg-slate-900 rounded-xl h-auto">
                <TabsTrigger value="scanner" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white py-3 font-semibold">
                  🔍 Reddit News Scanner
                </TabsTrigger>
                <TabsTrigger value="models" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white py-3 font-semibold">
                  📊 Model Comparison
                </TabsTrigger>
                <TabsTrigger value="game" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white py-3 font-semibold">
                  🎮 Educational Games
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="scanner" className="mt-6">
                <RedditNewsScanner />
              </TabsContent>
              
              <TabsContent value="models" className="mt-6">
                <ModelComparison />
              </TabsContent>

              <TabsContent value="game" className="mt-6">
                <div className="grid gap-6">
                  {!currentGame ? (
                    <Card className="p-4 sm:p-6">
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <GamepadIcon className="h-5 w-5" />
                            <h3 className="text-lg font-semibold">Fake News Quiz</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">Test your ability to spot fake news in this interactive quiz.</p>
                          <Button variant="outline" className="w-full" onClick={() => setCurrentGame('quiz')}>
                            Start Quiz
                          </Button>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Zap className="h-5 w-5" />
                            <h3 className="text-lg font-semibold">Speed Challenge</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">Race against time to identify fake news quickly.</p>
                          <Button variant="outline" className="w-full" onClick={() => setCurrentGame('speed')}>
                            Start Challenge
                          </Button>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <TrophyIcon className="h-5 w-5" />
                            <h3 className="text-lg font-semibold">Leaderboard</h3>
                          </div>
                          <p className="text-sm text-muted-foreground">See how you rank against other fake news detectors.</p>
                          <Button variant="outline" className="w-full" onClick={() => setCurrentGame('leaderboard')}>
                            View Leaderboard
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      <Button variant="outline" onClick={() => setCurrentGame(null)} className="mb-4">
                        ← Back to Menu
                      </Button>
                      {currentGame === 'quiz' && <FakeNewsQuiz />}
                      {currentGame === 'speed' && <SpeedChallenge />}
                      {currentGame === 'leaderboard' && <Leaderboard />}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
