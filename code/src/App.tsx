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
      const response = await fetch('https://fakenewsdetectiobackend-production.up.railway.app/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newsInput }),
      });
      if (!response.ok) throw new Error('Failed to analyze news.');
      const data = await response.json();
      setPredictions(data);
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
              <h1 className="text-2xl font-bold">Fake News Detector</h1>
            </div>
            <ModeToggle />
          </div>
        </header>

        <main className="flex-1 w-full flex flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-6xl">
            <Card className="p-6 sm:p-8 mb-12 w-full">
              <h2 className="text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-3">
                <BrainCircuitIcon className="h-6 w-6 sm:h-8 sm:w-8" />
                News Analysis
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground mb-8">
                Enter a news article to analyze its authenticity using our machine learning models.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Input
                  placeholder="Paste news article here..."
                  value={newsInput}
                  onChange={(e) => setNewsInput(e.target.value)}
                  className="flex-1 text-lg p-4"
                />
                <Button className="w-full sm:w-auto text-lg p-4" onClick={handleAnalyze} disabled={loading}>
                  {loading ? 'Analyzing...' : 'Analyze'}
                </Button>
              </div>
              {error && <p className="text-red-500 mt-4">{error}</p>}
              {predictions && (
                <div className="mt-6 p-4 border rounded-lg">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-3">
                    Prediction Analysis
                  </h2>
                  <ul className="text-lg space-y-2">
                    {Object.entries(predictions).map(([model, result]) => (
                      <li key={model} className="flex justify-between items-center">
                        <span className="font-medium">{model}:</span>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            result === "Real"
                              ? "bg-black-100 text-green-700 border border-green-500"
                              : "bg-black-100 text-red-700 border border-red-500"
                          }`}
                        >
                          {result}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>

            <Tabs defaultValue="models" className="mb-8">
              <TabsList className="grid w-full grid-cols-2 gap-2">
                <TabsTrigger value="models">Model Comparison</TabsTrigger>
                <TabsTrigger value="game">Educational Games</TabsTrigger>
              </TabsList>
              <TabsContent value="models">
                <ModelComparison />
              </TabsContent>
              <TabsContent value="game">
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
