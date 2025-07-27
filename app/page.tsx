'use client';

import { useState, useCallback } from 'react';
import { IoCloudUploadOutline, IoBookOutline, IoSparklesOutline, IoLibraryOutline, IoSettingsOutline, IoBookmarkOutline } from 'react-icons/io5';
import EPUBReader from './components/EPUBReader';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleHighlight = useCallback((text: string) => {
    // TODO: Implement AI analysis of highlighted text
    setAiInsights(prev => [...prev, `Analysis of: ${text}`]);
  }, []);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.toLowerCase().endsWith('.epub')) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  return (
    <main className="min-h-screen bg-background">
      {/* Premium Navigation Header */}
      <header className="fixed top-0 w-full nav-glass z-50 animate-fade-in">
        <div className="container-fluid h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <IoBookOutline className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                nuReader
              </h1>
            </div>
            <div className="hidden md:flex items-center space-x-1 ml-8">
              <span className="px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                AI-Powered
              </span>
              <span className="px-3 py-1 text-xs font-medium bg-accent/10 text-accent rounded-full">
                Premium
              </span>
            </div>
          </div>
          
          <nav className="flex items-center space-x-2">
            <button className="btn-ghost flex items-center space-x-2">
              <IoLibraryOutline className="w-5 h-5" />
              <span className="hidden md:inline">Library</span>
            </button>
            <button className="btn-ghost flex items-center space-x-2">
              <IoBookmarkOutline className="w-5 h-5" />
              <span className="hidden md:inline">Bookmarks</span>
            </button>
            <button className="btn-ghost flex items-center space-x-2">
              <IoSettingsOutline className="w-5 h-5" />
              <span className="hidden md:inline">Settings</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-24 pb-16">
        <div className="container-fluid">
          {!file ? (
            /* Premium Welcome Screen */
            <div className="animate-slide-up">
              {/* Hero Section */}
              <div className="text-center mb-16">
                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-primary/10 rounded-full mb-6 animate-gentle-bounce">
                  <IoSparklesOutline className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-primary">Experience the Future of Reading</span>
                </div>
                
                <h1 className="text-6xl md:text-7xl font-bold text-foreground mb-6 tracking-tight">
                  Transform Your
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> Reading</span>
                </h1>
                
                <p className="text-xl text-foreground-secondary max-w-3xl mx-auto leading-relaxed mb-8">
                  Immerse yourself in your favorite books with AI-powered insights, beautiful typography, 
                  and an interface designed for the ultimate reading experience.
                </p>
              </div>

              {/* Premium Upload Zone */}
              <div className="max-w-2xl mx-auto">
                <div
                  className={`upload-zone ${isDragOver ? 'border-primary bg-primary/10 scale-[1.02]' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center">
                    <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 animate-subtle-pulse">
                      <IoCloudUploadOutline className="w-12 h-12 text-primary" />
                    </div>
                    
                    <h3 className="text-2xl font-semibold text-foreground mb-3">
                      Drop your EPUB file here
                    </h3>
                    
                    <p className="text-foreground-secondary mb-8 max-w-md leading-relaxed">
                      Drag and drop your EPUB file or click below to browse. Experience reading 
                      like never before with AI-powered insights and premium typography.
                    </p>
                    
                    <label className="btn-primary cursor-pointer">
                      <IoBookOutline className="w-5 h-5 mr-2" />
                      <span>Choose EPUB File</span>
                      <input
                        type="file"
                        accept=".epub"
                        className="hidden"
                        onChange={(e) => {
                          const selectedFile = e.target.files?.[0];
                          if (selectedFile) handleFileSelect(selectedFile);
                        }}
                      />
                    </label>
                    
                    <div className="flex items-center space-x-4 mt-8 text-sm text-foreground-muted">
                      <span>Supports EPUB 2 & 3</span>
                      <span>•</span>
                      <span>AI Analysis</span>
                      <span>•</span>
                      <span>Privacy First</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature Highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-20">
                <div className="card text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <IoSparklesOutline className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">AI-Powered Insights</h3>
                  <p className="text-foreground-secondary">
                    Get intelligent summaries, themes, and contextual analysis as you read.
                  </p>
                </div>
                
                <div className="card text-center">
                  <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <IoBookOutline className="w-8 h-8 text-accent" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Premium Typography</h3>
                  <p className="text-foreground-secondary">
                    Beautiful, readable fonts optimized for long-form reading comfort.
                  </p>
                </div>
                
                <div className="card text-center">
                  <div className="w-16 h-16 bg-success/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <IoLibraryOutline className="w-8 h-8 text-success" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Immersive Interface</h3>
                  <p className="text-foreground-secondary">
                    Distraction-free design that puts your content center stage.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Premium Reading Interface */
            <div className="reading-layout animate-fade-in">
              {/* Reader Area */}
              <div className="reading-main">
                <div className="card p-0 overflow-hidden">
                  <EPUBReader file={file} onHighlight={handleHighlight} />
                </div>
              </div>

              {/* AI Insights Sidebar */}
              <div className="reading-sidebar">
                <div className="sticky top-28 space-y-6">
                  {/* AI Insights Panel */}
                  <div className="card">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <IoSparklesOutline className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground">
                        AI Insights
                      </h3>
                    </div>
                    
                    <div className="space-y-4">
                      {aiInsights.length > 0 ? (
                        aiInsights.map((insight, index) => (
                          <div key={index} className="p-4 bg-muted/50 rounded-xl animate-slide-up">
                            <p className="text-sm text-foreground-secondary leading-relaxed">
                              {insight}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 bg-muted/30 rounded-xl text-center">
                          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                            <IoSparklesOutline className="w-6 h-6 text-primary" />
                          </div>
                          <p className="text-sm text-foreground-secondary mb-2">
                            Start Reading
                          </p>
                          <p className="text-xs text-foreground-muted">
                            AI insights and analysis will appear here as you highlight text and progress through your book.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reading Progress */}
                  <div className="card">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Reading Progress</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground-secondary">Today</span>
                        <span className="text-foreground">0 minutes</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill w-0"></div>
                      </div>
                      <p className="text-xs text-foreground-muted">
                        Set a reading goal in Settings to track your progress.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
