'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, TrendingUp, Users, FileText, Sparkles, History, CheckCircle2, XCircle } from 'lucide-react';

interface BrandMention {
  brand: string;
  count: number;
  context: string[];
  citationUrls: string[];
}

interface VisibilityResult {
  category: string;
  brands: string[];
  mentions: BrandMention[];
  totalMentions: number;
  timestamp: string;
}

interface PromptWithMentions {
  id: number;
  category: string;
  prompt: string;
  aiProvider: string;
  timestamp: string;
  brands: Array<{
    brandName: string;
    mentioned: boolean;
    mentionCount: number;
  }>;
}

type AIProvider = 'openai' | 'anthropic' | 'groq';

export default function Home() {
  const [category, setCategory] = useState('');
  const [brandsInput, setBrandsInput] = useState('');
  const [mainBrand, setMainBrand] = useState('');
  const [aiProvider, setAiProvider] = useState<AIProvider>('openai');
  const [isCompetitorMode, setIsCompetitorMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VisibilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({ promptsTracked: 0, brandsTracked: 0 });
  const [historicalPrompts, setHistoricalPrompts] = useState<PromptWithMentions[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);

  // Fetch metrics on component mount
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/metrics');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setMetrics(data.data);
          }
        }
      } catch (err) {
        // Silently fail metrics fetch
        console.error('Failed to fetch metrics:', err);
      }
    };
    fetchMetrics();
  }, [result]); // Refetch when new result is added

  // Fetch historical prompts
  const fetchHistoricalPrompts = async () => {
    setLoadingPrompts(true);
    try {
      const response = await fetch('/api/prompts?limit=20');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setHistoricalPrompts(data.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch historical prompts:', err);
    } finally {
      setLoadingPrompts(false);
    }
  };

  // Fetch historical prompts on mount and when new result is added
  useEffect(() => {
    fetchHistoricalPrompts();
  }, [result]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const brands = brandsInput.split(',').map(b => b.trim()).filter(Boolean);
      
      if (!category || brands.length === 0) {
        setError('Please provide both category and at least one brand');
        setLoading(false);
        return;
      }

      if (isCompetitorMode && !mainBrand.trim()) {
        setError('Main brand is required when competitor mode is enabled');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/check-visibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          category, 
          brands,
          provider: aiProvider,
          isCompetitorMode,
          mainBrand: isCompetitorMode ? mainBrand.trim() : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to check visibility');
      }

      const data = await response.json();
      if (data.success) {
        setResult(data.data);
        // Refresh metrics after successful check
        const metricsResponse = await fetch('/api/metrics');
        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json();
          if (metricsData.success) {
            setMetrics(metricsData.data);
          }
        }
      } else {
        throw new Error(data.error || 'Failed to check visibility');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const calculateCitationShare = (brandMentions: number, totalMentions: number) => {
    if (totalMentions === 0) return 0;
    return ((brandMentions / totalMentions) * 100).toFixed(1);
  };

  const calculateVisibilityScore = (mentions: BrandMention[], totalBrands: number) => {
    if (totalBrands === 0) return 0;
    const mentionedBrands = mentions.filter(m => m.count > 0).length;
    return ((mentionedBrands / totalBrands) * 100).toFixed(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            AI Visibility Tracker
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Track your brand's visibility in AI search results
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Check AI Visibility</CardTitle>
            <CardDescription>
              Enter a category and brands to track their mentions in AI responses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Competitor Mode Toggle */}
              <div className="flex items-center space-x-2 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <Switch
                  id="competitor-mode"
                  checked={isCompetitorMode}
                  onCheckedChange={setIsCompetitorMode}
                  disabled={loading}
                />
                <Label htmlFor="competitor-mode" className="cursor-pointer">
                  Competitor Impersonation Mode
                </Label>
              </div>

              {/* Main Brand (for competitor mode) */}
              {isCompetitorMode && (
                <div>
                  <label htmlFor="main-brand" className="block text-sm font-medium mb-2">
                    Main Brand (Your Brand)
                  </label>
                  <Input
                    id="main-brand"
                    type="text"
                    placeholder="e.g., YourCompany"
                    value={mainBrand}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMainBrand(e.target.value)}
                    disabled={loading}
                  />
                </div>
              )}

              <div>
                <label htmlFor="category" className="block text-sm font-medium mb-2">
                  Category
                </label>
                <Input
                  id="category"
                  type="text"
                  placeholder="e.g., CRM software, project management tools"
                  value={category}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCategory(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="brands" className="block text-sm font-medium mb-2">
                  {isCompetitorMode ? 'Competitor Brands (comma-separated)' : 'Brands (comma-separated)'}
                </label>
                <Input
                  id="brands"
                  type="text"
                  placeholder="e.g., Salesforce, HubSpot, Pipedrive"
                  value={brandsInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBrandsInput(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* AI Provider Selection */}
              <div>
                <label htmlFor="ai-provider" className="block text-sm font-medium mb-2">
                  AI Provider
                </label>
                <Select value={aiProvider} onValueChange={(value) => setAiProvider(value as AIProvider)} disabled={loading}>
                  <SelectTrigger id="ai-provider">
                    <SelectValue placeholder="Select AI Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI (GPT-4o-mini)</SelectItem>
                    <SelectItem value="anthropic">Anthropic (Claude 3.5 Sonnet)</SelectItem>
                    <SelectItem value="groq">Groq (Llama 3.3 70B)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Search className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Check Visibility
                  </>
                )}
              </Button>
            </form>

            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {result && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">AI Visibility Score</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {calculateVisibilityScore(result.mentions, result.brands.length)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {result.mentions.filter(m => m.count > 0).length} of {result.brands.length} brands mentioned
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Citation Share</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {result.mentions.length > 0
                      ? calculateCitationShare(
                          result.mentions[0]?.count || 0,
                          result.totalMentions
                        ) + '%'
                      : '0%'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Top brand: {result.mentions[0]?.brand || 'N/A'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Prompts Tracked</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.promptsTracked}</div>
                  <p className="text-xs text-muted-foreground">
                    Total prompts in database
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle>Brand Leaderboard</CardTitle>
                <CardDescription>
                  Brands ranked by mention count and citation share
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.mentions
                    .sort((a, b) => b.count - a.count)
                    .map((mention, index) => (
                      <div
                        key={mention.brand}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-semibold">{mention.brand}</p>
                            <p className="text-sm text-muted-foreground">
                              {mention.count} mention{mention.count !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">
                            {calculateCitationShare(mention.count, result.totalMentions)}%
                          </p>
                          <p className="text-xs text-muted-foreground">Citation Share</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Prompt Details */}
            <Card>
              <CardHeader>
                <CardTitle>Prompt Analysis</CardTitle>
                <CardDescription>
                  Detailed breakdown of brand mentions for: "{result.category}"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.brands.map((brand) => {
                    const mention = result.mentions.find((m) => m.brand === brand);
                    return (
                      <div
                        key={brand}
                        className={`p-4 border rounded-lg ${
                          mention && mention.count > 0
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold">{brand}</p>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              mention && mention.count > 0
                                ? 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100'
                                : 'bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100'
                            }`}
                          >
                            {mention && mention.count > 0 ? 'Mentioned' : 'Not Mentioned'}
                          </span>
                        </div>
                        {mention && mention.count > 0 && (
                          <div className="mt-2">
                            <p className="text-sm text-muted-foreground mb-2">
                              Mentioned {mention.count} time{mention.count !== 1 ? 's' : ''}
                            </p>
                            {mention.context.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium mb-1">Context:</p>
                                <ul className="list-disc list-inside text-xs space-y-1">
                                  {mention.context.slice(0, 3).map((ctx, idx) => (
                                    <li key={idx} className="text-muted-foreground">
                                      {ctx}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Top Cited Pages */}
            {result.mentions.some((m) => m.citationUrls.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Cited Pages</CardTitle>
                  <CardDescription>
                    URLs most frequently cited in AI responses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Array.from(
                      new Set(
                        result.mentions.flatMap((m) => m.citationUrls)
                      )
                    )
                      .slice(0, 10)
                      .map((url, idx) => (
                        <div
                          key={idx}
                          className="p-3 border rounded-lg hover:bg-accent transition-colors"
                        >
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                          >
                            {url}
                          </a>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Historical Prompts List */}
        {historicalPrompts.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Prompt History
                  </CardTitle>
                  <CardDescription>
                    List of prompts where brands are being mentioned or not being mentioned
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchHistoricalPrompts}
                  disabled={loadingPrompts}
                >
                  {loadingPrompts ? 'Loading...' : 'Refresh'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {historicalPrompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className="p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-lg">{prompt.category}</h4>
                          <span className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded">
                            {prompt.aiProvider}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {prompt.prompt}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(prompt.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm font-medium mb-2">Brand Mentions:</p>
                      <div className="flex flex-wrap gap-2">
                        {prompt.brands.map((brandMention, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                              brandMention.mentioned
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                            }`}
                          >
                            {brandMention.mentioned ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            <span className="font-medium">{brandMention.brandName}</span>
                            {brandMention.mentioned && (
                              <span className="text-xs">
                                ({brandMention.mentionCount}x)
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
