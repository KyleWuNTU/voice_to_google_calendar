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
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true
}));

// Middleware
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/', eventRoutes);

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});