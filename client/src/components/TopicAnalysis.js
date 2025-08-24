import React, { useState } from 'react';
import AnalysisDashboard from './AnalysisDashboard';

const TopicAnalysis = () => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    setResult(null);
    setError('');

    try {
      const response = await fetch('http://localhost:3001/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNzU1MTY5MjY2LCJleHAiOjE3NTc3NjEyNjZ9.JIz5Q6AuHyMKfr6dyo2cwwiElwHdUdBtI01I1hIfs4A"}`, // <-- YES, THIS IS THE LINE WHERE YOU USE THE TOKEN.
        },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'An unknown error occurred.');
      }
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Analyze a News Topic</h2>
      <p>Enter a topic to get a real-time summary from live news articles.</p>
      <form onSubmit={handleSubmit} className="input-group">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g., future of renewable energy"
        />
        <button type="submit" className="submit-button" disabled={loading || !query}>
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </form>

      {loading && <div className="status-message">Fetching and analyzing live news...</div>}
      {error && <div className="error-message">{error}</div>}
      
      {result && (
        <div className="results">
            <h3>AI-Generated Summary</h3>
            <p>{result.summary}</p>

            {/* --- NEW DASHBOARD --- */}
            {result.classification_breakdown && result.classification_breakdown !== "N/A" && (
                <AnalysisDashboard data={result.classification_breakdown} />
            )}
          <h3>Top 5 Source Articles</h3>
          <ul>
            {result.top_articles.map((article, index) => (
              <li key={index}>
                <a href={article.link} target="_blank" rel="noopener noreferrer">
                  {article.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TopicAnalysis;