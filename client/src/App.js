import React, { useState } from 'react';
import TopicAnalysis from './components/TopicAnalysis';
import ArticleSummarizer from './components/ArticleSummarizer';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('analyze');

  return (
    <div className="App">
      <header>
        <h1>News Analyst AI</h1>
        <nav>
          <button
            onClick={() => setActiveTab('analyze')}
            className={activeTab === 'analyze' ? 'active' : ''}
          >
            Topic Analysis
          </button>
          <button
            onClick={() => setActiveTab('summarize')}
            className={activeTab === 'summarize' ? 'active' : ''}
          >
            Article Summarizer
          </button>
        </nav>
      </header>
      <main>
        <div className="feature-container">
          {activeTab === 'analyze' ? <TopicAnalysis /> : <ArticleSummarizer />}
        </div>
      </main>
    </div>
  );
}

export default App;