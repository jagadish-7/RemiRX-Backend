const express = require('express');
const Client = require('../models/Client');
const Visit = require('../models/Visit');
const auth = require('./auth').auth;

const router = express.Router();

// Get all clients for a stylist
router.get('/', auth, async (req, res) => {
  try {
    const { search, sort } = req.query;
    let query = { stylistId: req.user.id };

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    let sortOption = {};
    if (sort === 'name') {
      sortOption = { fullName: 1 };
    } else {
      sortOption = { addedDate: -1 };
    }

    const clients = await Client.find(query).sort(sortOption);
    res.json(clients);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single client
router.get('/:id', auth, async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, stylistId: req.user.id });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add new client
router.post('/', auth, async (req, res) => {
  try {
    const { fullName, email, phone, sex, firstVisitDate } = req.body;

    if (!fullName || !firstVisitDate) {
      return res.status(400).json({ message: 'Full name and first visit date are required' });
    }

    const newClient = new Client({
      fullName,
      email,
      phone,
      sex,
      firstVisitDate: new Date(firstVisitDate),
      stylistId: req.user.id
    });

    await newClient.save();
    res.status(201).json(newClient);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update client
router.put('/:id', auth, async (req, res) => {
  try {
    const { fullName, email, phone, sex, firstVisitDate } = req.body;

    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, stylistId: req.user.id },
      { fullName, email, phone, sex, firstVisitDate: new Date(firstVisitDate) },
      { new: true }
    );

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete client
router.delete('/:id', auth, async (req, res) => {
  try {
    const client = await Client.findOneAndDelete({ _id: req.params.id, stylistId: req.user.id });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Also delete all visits for this client
    await Visit.deleteMany({ clientId: req.params.id });

    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
