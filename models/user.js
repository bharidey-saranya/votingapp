const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    age: { type: Number, required: true },
    email: { type: String },
    mobile: { type: String },
    aadharCardNumber: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Voter', 'admin'], default: 'Voter' },
    isVoted: { type: Boolean, default: false },
    isactive: { type: Boolean, default: true }
})

module.exports = mongoose.model('User', UserSchema);