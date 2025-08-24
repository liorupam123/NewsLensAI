require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;
const AI_SERVICE_URL = process.env.AI_SERVICE_URL;
const JWT_SECRET = process.env.JWT_SECRET;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- In-Memory User Store (Replace with a Database in Production) ---
const users = [];

// --- Reusable function to generate JWT token ---
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: '30d',
  });
};

// --- Authentication Routes ---

// @desc    Register a new user
// @route   POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please enter all fields' });
  }

  // Check if user already exists
  const userExists = users.find((user) => user.email === email);
  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user object
  const user = { id: users.length + 1, email, password: hashedPassword };
  users.push(user);
  console.log('New user registered:', user);

  res.status(201).json({
    id: user.id,
    email: user.email,
    token: generateToken(user.id),
  });
});

// @desc    Authenticate a user
// @route   POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = users.find((user) => user.email === email);
  if (!user) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  // Check password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  res.json({
    id: user.id,
    email: user.email,
    token: generateToken(user.id),
  });
});


// --- Protection Middleware ---
const protect = (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer')) {
    try {
      // Get token from header
      token = authHeader.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Attach user to the request (optional, but good practice)
      req.user = users.find(u => u.id === decoded.id);
      next();

    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};


// --- Generic Proxy Function (remains the same) ---
const forwardRequest = async (path, body, res) => {
  if (!AI_SERVICE_URL) {
    return res.status(500).json({ error: 'AI service URL is not configured.' });
  }
  try {
    const response = await fetch(`${AI_SERVICE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    res.json(data);
  } catch (error) {
    console.error(`Error forwarding request to ${path}:`, error);
    res.status(503).json({ error: 'Failed to communicate with the AI service.' });
  }
};


// --- Protected AI Routes ---
// The 'protect' middleware is now added before the main logic.
app.post('/api/analyze', protect, (req, res) => {
  forwardRequest('/analyze-topic', req.body, res);
});

app.post('/api/summarize', protect, (req, res) => {
  forwardRequest('/summarize-text', req.body, res); // Updated path
});


// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});