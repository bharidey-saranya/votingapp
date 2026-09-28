const mongoose = require('mongoose');
const CandidateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    party: { type: String, required: true },
    age: { type: Number, required: true },
    image: { type: String },
    symbol: { type: String },
    votes: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true
        },
        votedAt: {
            type: Date,
            default: Date.now
        }
    }],
    voteCount: { type: Number, default: 0 },
    isactive: { type: Boolean, default: true }
})

module.exports = mongoose.model('candidate', CandidateSchema);