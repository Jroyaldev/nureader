'use client';

import { useState } from 'react';
import EPUBReader from './components/EPUBReader';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [aiInsights, setAiInsights] = useState<string[]>([]);

  const handleHighlight = (text: string) => {
    // TODO: Implement AI analysis of highlighted text
    setAiInsights(prev => [...prev, `Analysis of: ${text}`]);
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 w-full bg-background/80 backdrop-blur-xl border-b border-border/50 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-medium text-foreground">nuReader</h1>
          <nav className="flex items-center space-x-4">
            <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80 rounded-full transition-colors">
              Library
            </button>
            <button className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80 rounded-full transition-colors">
              Settings
            </button>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {!file ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] border-2 border-dashed border-border rounded-2xl bg-background p-8">
            <div className="text-center max-w-md">
              <h2 className="text-xl font-medium text-foreground mb-3">
                Welcome to nuReader
              </h2>
              <p className="text-muted-foreground mb-6">
                Drop your EPUB file here or click to browse. Experience reading with AI-powered insights and beautiful typography.
              </p>
              <label className="btn-primary cursor-pointer">
                <span>Choose EPUB</span>
                <input
                  type="file"
                  accept=".epub"
                  className="hidden"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0];
                    if (selectedFile) setFile(selectedFile);
                  }}
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Reader area */}
            <div className="lg:col-span-8 bg-background rounded-2xl p-8 shadow-sm">
              <EPUBReader file={file} onHighlight={handleHighlight} />
            </div>

            {/* AI Insights sidebar */}
            <div className="lg:col-span-4">
              <div className="sticky top-24">
                <div className="bg-background rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-medium text-foreground mb-4">
                    AI Insights
                  </h3>
                  <div className="space-y-4">
                    {aiInsights.length > 0 ? (
                      aiInsights.map((insight, index) => (
                        <div key={index} className="p-4 bg-muted/50 rounded-xl">
                          <p className="text-sm text-muted-foreground">
                            {insight}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 bg-muted/50 rounded-xl">
                        <p className="text-sm text-muted-foreground">
                          AI analysis and highlights will appear here as you read.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
