const express = require('express');
const User = require('../models/User');
const auth = require('./auth').auth;

const router = express.Router();

// Update stylist profile
router.put('/', auth, async (req, res) => {
  try {
    const { firstName, lastName, salonName, licenseNumber } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { 
        firstName, 
        lastName, 
        salonName, 
        licenseNumber,
        profileCompleted: true 
      },
      { new: true }
    ).select('-password');

    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
