const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/user');
const { jwtAuthMiddleware, generateToken } = require('./../jwt');

// user signup
router.post('/signup', async (req, res) => {

    const data = req.body;
    if (!/^\d{12}$/.test(data.aadharCardNumber)) {
        return res.status(400).json({ error: 'Aadhar Card Number must be exactly 12 digits' });
    }

    if (!data.password) {
        return res.status(400).json({ error: 'Password is required' })
    }

    if (data.password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' })
    }

    const passwordallowed = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[%@!&#*.])[A-Za-z\d%@!&#*.]{6,}$/;
    if (!passwordallowed.test(data.password)) {
        return res.status(400).json({ error: 'Password must contain uppercase, lowercase, number, and special character' })
    try {
        const adminuser = await User.findOne({ role: 'admin' });
        if (data.role === 'admin' && adminuser) {
            return res.status(400).json({ error: 'Admin user already exists' });
        }

        data.password = await bcrypt.hash(data.password, 10);
        const existinguser = await User.findOne({ aadharCardNumber: data.aadharCardNumber });
        if (existinguser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const adduser = new User(data);
        const response = await adduser.save();
        const payload = {
            id: response._id,
            name: response.name,
            role: response.role
        };

        if (!response) {
            return res.status(400).json({ error: 'User not created' });
        }
        const token = generateToken(payload)
        console.log('User created successfully');
        return res.status(201).json({ response, token });
    }
    catch (error) {
        console.error('Error in user signup:', error);
        return res.status(500).json({ error: 'Internal server error ' + error.message });
    }
})

// user login

router.post('/login', async (req, res) => {

    const { aadharCardNumber, password } = req.body;
    try {
        if (!aadharCardNumber || !password) {
            return res.status(400).json({ error: 'Aadhar Card Number and Password are required' });
        }

        const checklogin = await User.findOne({ aadharCardNumber: aadharCardNumber });
        if (!checklogin) {
            return res.status(401).json({ error: 'Invalid Aadhar Card Number' });
        }

        if (checklogin.isactive == false) {
            return res.status(401).json({ error: 'Your account has been deactivated.' });
        }

        const isPasswordValid = await bcrypt.compare(password, checklogin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid Password' });
        }

        const payload = {
            id: checklogin._id,
            name: checklogin.name,
            role: checklogin.role
        }

        const token = generateToken(payload);
        return res.status(200).json({ message: 'User logged in successfully', token })

    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' })
    }
});


//Profile check

router.get('/profile', jwtAuthMiddleware, async (req, res) => {
    const userprofile = await User.findById(req.user.id)
    if (userprofile) {
        return res.status(200).json(userprofile);
    }
    else {
        return res.status(400).json({ error: 'User not found' });
    }
})

//update User Password
router.put('/updatepswd', jwtAuthMiddleware, async (req, res) => {
    try {

        const { newpassword, currentpswd, confirmpswd } = req.body;
        const targetUserId = req.body.userid || req.user.id;

        const oldpswd = await User.findById(targetUserId);
        if (!oldpswd) {
            return res.status(404).json({ error: 'User not found' });
        }
        const isPasswordValid = await bcrypt.compare(currentpswd, oldpswd.password);

        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Invalid current Password' });
        }

        if (currentpswd == newpassword) {
            return res.status(400).json({ error: 'current password and new password are same' });
        }
        if (confirmpswd !== newpassword) {
            return res.status(400).json({ error: 'new password and confirm password are not same' });
        }
        const passwordallowed = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[%@!&#*.])[A-Za-z\d%@!&#*.]{6,}$/;
        if (!passwordallowed.test(newpassword)) {
            return res.status(400).json({ error: 'Password must contain uppercase, lowercase, number, and special character' });
        }
        const hashpassword = await bcrypt.hash(newpassword, 10);
        oldpswd.password = hashpassword;
        await oldpswd.save();
        return res.status(200).json({ message: 'Password updated successfully' });

    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
