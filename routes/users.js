// routes/users.js
const express = require('express');
const User = require('../models/User');
const { auth } = require('./auth');

const router = express.Router();

/** GET /api/users/me */
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

/** PUT /api/users/me — independent field updates */
router.put('/me', auth, async (req, res) => {
  try {
    const allowed = [
      'fullName',
      'firstName',
      'lastName',
      'email',
      'phone',
      'salonName',
      'licenseNumber',
      'profileCompleted',
    ];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    // normalize email + uniqueness
    if (updates.email !== undefined) {
      updates.email = String(updates.email).toLowerCase().trim();
      const exists = await User.findOne({
        email: updates.email,
        _id: { $ne: req.user.id },
      });
      if (exists) return res.status(409).json({ message: 'Email already in use' });
    }

    // basic trim on string fields
    ['fullName', 'firstName', 'lastName', 'phone', 'salonName', 'licenseNumber'].forEach(k => {
      if (updates[k] !== undefined && typeof updates[k] === 'string') {
        updates[k] = updates[k].trim();
      }
    });

    // IMPORTANT: no auto-splitting/composing between fullName and first/last
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates, $currentDate: { updatedAt: true } },
      { new: true, runValidators: true, context: 'query' }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
