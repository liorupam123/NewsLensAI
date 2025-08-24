import React, { useState } from 'react';

const ArticleSummarizer = ({ token }) => {
  const [text, setText] = useState(''); // Changed from 'url' to 'text'
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text) return;

    setLoading(true);
    setResult(null);
    setError('');

    try {
      const response = await fetch('http://localhost:3001/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNzU1MTY5MjY2LCJleHAiOjE3NTc3NjEyNjZ9.JIz5Q6AuHyMKfr6dyo2cwwiElwHdUdBtI01I1hIfs4A"}`,
        },
        body: JSON.stringify({ text }), // Changed from { url } to { text }
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.message || 'Failed to summarize.');
      setResult(data);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Summarize an Article</h2>
      <p>Copy and paste the full text of a news article below to get a concise summary.</p>
      <form onSubmit={handleSubmit} className="input-group">
        {/* Changed from input to textarea */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste the full article text here..."
          rows="15"
          style={{ width: '95%', padding: '12px', fontSize: '16px', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <button type="submit" className="submit-button" disabled={loading || !text}>
          {loading ? 'Summarizing...' : 'Summarize'}
        </button>
      </form>

      {loading && <div className="status-message">Reading and summarizing...</div>}
      {error && <div className="error-message">{error}</div>}

      {result && (
        <div className="results">
          <h3>Summary</h3>
          <p>{result.summary}</p>
        </div>
      )}
    </div>
  );
};

export default ArticleSummarizer;