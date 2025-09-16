// const mongoose = require('mongoose');

// const visitSchema = new mongoose.Schema({
//   clientId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Client',
//     required: true
//   },
//   visitDate: {
//     type: Date,
//     default: Date.now
//   },
//   photos: [{
//     type: String
//   }],
//   notes: {
//     type: String,
//     trim: true
//   },
//   stylistId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   }
// });

// module.exports = mongoose.model('Visit', visitSchema);


const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  visitDate: {
    type: Date,
    default: Date.now
  },
  photos: [{
    type: String
  }],
  notes: {
    type: String,
    trim: true
  },
  stylistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true // <-- adds createdAt / updatedAt
});

/**
 * Helpful index for the queries we do (by stylist + newest first).
 * createdAt for “latest activity”, and visitDate as a secondary key.
 */
visitSchema.index({ stylistId: 1, createdAt: -1, visitDate: -1 });

module.exports = mongoose.model('Visit', visitSchema);
