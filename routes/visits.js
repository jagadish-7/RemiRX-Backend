const express = require('express');
const multer = require('multer');
const path = require('path');
const Visit = require('../models/Visit');
const Client = require('../models/Client');
const auth = require('./auth').auth;

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'visit-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Get all visits for a client
router.get('/:clientId', auth, async (req, res) => {
  try {
    const visits = await Visit.find({ 
      clientId: req.params.clientId,
      stylistId: req.user.id 
    }).sort({ visitDate: -1 });

    res.json(visits);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add new visit with photos
router.post('/', auth, upload.array('photos', 20), async (req, res) => {
  try {
    const { clientId, visitDate, notes } = req.body;

    if (!clientId) {
      return res.status(400).json({ message: 'Client ID is required' });
    }

    // Check if client belongs to this stylist
    const client = await Client.findOne({ _id: clientId, stylistId: req.user.id });
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    const photoPaths = req.files ? req.files.map(file => path.join('uploads', path.basename(file.path))) : [];

    const newVisit = new Visit({
      clientId,
      visitDate: visitDate ? new Date(visitDate) : new Date(),
      photos: photoPaths,
      notes,
      stylistId: req.user.id
    });

    await newVisit.save();

    // Update client's last visit date
    await Client.findByIdAndUpdate(clientId, { lastVisit: newVisit.visitDate });

    res.status(201).json(newVisit);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete visit
router.delete('/:id', auth, async (req, res) => {
  try {
    const visit = await Visit.findOneAndDelete({ 
      _id: req.params.id, 
      stylistId: req.user.id 
    });

    if (!visit) {
      return res.status(404).json({ message: 'Visit not found' });
    }

    res.json({ message: 'Visit deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
