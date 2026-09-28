const mongoose = require('mongoose');
require('dotenv').config();

const mongoURL = process.env.MONGODB_URL_LOCAL || process.env.MONGODB_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/voting';

mongoose.connect(mongoURL).catch((err) => {
    console.error('MongoDB initial connection error:', err.message);
});

const db = mongoose.connection;

db.on('connected', () => {
    console.log('Connected to MongoDB server');
});

db.on('error', (err) => {
    console.error('MongoDB connection error:', err.message || err);
});

db.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

module.exports = db;