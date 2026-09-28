const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const candidate = require('../models/candidate');
const { jwtAuthMiddleware } = require('./../jwt');
const User = require('../models/user');

router.post('/createcandidate', jwtAuthMiddleware, async (req, res) => {

    const admin = await User.findById(req.user.id);
    if (!admin) {
        return res.status(400).json({ error: 'User not found' });
    }

    if (admin.role !== 'admin') {
        return res.status(400).json({ error: 'Access denied. Admin role required' });
    }

    const data = req.body;

    if (!data.name || data.name.toString().trim() === '' || 
        !data.party || data.party.toString().trim() === '' || 
        data.age === undefined || data.age === null || data.age === '') {
        return res.status(400).json({ error: 'All fields (name, age, party) are required' });
    }
    try {
        const newcandidate = new candidate(data);
        const addcandidate = await newcandidate.save();
        if (addcandidate) {
            return res.status(200).json({ message: 'Candidate added successfully' });
        } else {
            return res.status(400).json({ error: 'Failed to add candidate' });
        }
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
})

//update User Password
router.put('/updatecandidate/:candidateid', jwtAuthMiddleware, async (req, res) => {
    try {

        const admin = await User.findById(req.user.id);
        if (!admin) {
            return res.status(400).json({ error: 'User not found' });
        }

        if (admin.role !== 'admin') {
            return res.status(400).json({ error: 'Access denied. Admin role required' });

        }

        const candidate_id = req.params.candidateid;
        if (candidate_id == '') {
            return res.status(400).json({ error: 'Candidate ID is required' });
        }
        console.log(candidate_id);
        const candidatedata = req.body;
        const updatecandidate = await candidate.findByIdAndUpdate(candidate_id, candidatedata);
        if (updatecandidate) {
            return res.status(200).json({ message: 'Candidate updated successfully' });
        } else {
            return res.status(400).json({ error: 'Failed to update candidate' });
        }

    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' + error });
    }
});

// candidate update status
router.put('/candidate_status/:candidateid', jwtAuthMiddleware, async (req, res) => {
    try {

        const admin = await User.findById(req.user.id);
        if (!admin) {
            return res.status(400).json({ error: 'User not found' });
        }

        if (admin.role !== 'admin') {
            return res.status(400).json({ error: 'Access denied. Admin role required' });

        }

        const candidate_id = req.params.candidateid;
        if (candidate_id == '') {
            return res.status(400).json({ error: 'Candidate ID is required' });
        }
        const status = req.body.isactive;
        const deletecandidate = await candidate.findByIdAndUpdate(candidate_id, { isactive: status });
        if (deletecandidate) {
            return res.status(200).json({ message: 'Candidate status updated successfully' });
        } else {
            return res.status(400).json({ error: 'Failed to update candidate status' });
        }

    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' + error });
    }
});

//candidate voting

router.post('/vote/:candidateid', jwtAuthMiddleware, async (req, res) => {
    try {

        const candidateId = req.params.candidateid;
        const voterId = req.user.id;

        // Check if voter has already voted
        const user = await User.findById(voterId);
        if (!user || user.role !== 'Voter') {
            return res.status(403).json({ error: 'Access denied. Only voters can vote.' });
        }

        if (user.isVoted) {
            return res.status(400).json({ error: 'You have already voted' });
        }

        // Check if candidate is active and exists
        const candidates = await candidate.findById(candidateId);
        console.log('Candidate:', candidates);
        console.log('isactive:', candidates?.isactive);

        if (!candidates || !candidates.isactive) {
            return res.status(400).json({ error: 'Invalid or inactive candidate' });
        }

        // Vote for the candidate
        candidates.votes.push({ userId: voterId });
        candidates.voteCount++;
        await candidates.save();

        // Mark voter as voted
        user.isVoted = true;
        await user.save();

        res.status(200).json({ message: 'Vote cast successfully', candidates });

    } catch (error) {
        console.error('Error in voting:', error);
        res.status(500).json({ error: 'Internal server error' + error });
    }
});

//voter count

router.get('/votecount', jwtAuthMiddleware, async (req, res) => {
    try {
        const candidates = await candidate.find().sort({ voteCount: -1 });
        const voterecord = candidates.map((c) => {
            return {
                id: c._id,
                name: c.name,
                party: c.party,
                voteCount: c.voteCount || 0
            };
        });
        return res.status(200).json({ message: 'Vote count fetched successfully', voterecord });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error' + error });
    }
});

//candidate list 

router.get('/candidatelist', async (req, res) => {
    const candidatelist = await candidate.find();
    if (candidatelist) {
        return res.status(200).json({ message: 'Candidate list fetched successfully', candidatelist });
    }
    else {
        return res.status(400).json({ error: 'Failed to fetch candidate list' });
    }

})

module.exports = router;
