const express = require('express');
const path = require('path');
const db = require('./db');
require('dotenv').config();
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());

// Serve static frontend files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

const { jwtAuthMiddleware } = require('./jwt');
const userRoutes = require('./routes/UserRoutes.js');
app.use('/user', userRoutes);

const CandidateRoutes = require('./routes/CandidateRoutes.js');
app.use('/candidate', jwtAuthMiddleware, CandidateRoutes);

// Fallback to index.html for frontend root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
});

module.exports = app;

