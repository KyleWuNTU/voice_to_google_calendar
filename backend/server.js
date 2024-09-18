require('dotenv').config();
const express = require('express');
const path = require('path');
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for the frontend origin
app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}));

// Middleware to ensure JSON responses for /auth routes
app.use('/auth', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Routes
app.use('/auth', authRoutes);
app.use('/', eventRoutes);

// The "catchall" handler should come after all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});