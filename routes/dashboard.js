// // backend/routes/dashboard.js
// const express = require('express');
// const mongoose = require('mongoose');            // <-- add this
// const Client = require('../models/Client');
// const Visit = require('../models/Visit');
// const auth = require('./auth').auth;

// const router = express.Router();

// /**
//  * GET /api/dashboard/stats
//  *  - Dashboard quick stats
//  *    • totalClients: all clients for stylist
//  *    • recentVisits: visits in the last 30 days (by visitDate)
//  *    • photosThisMonth: sum of photo counts for visits created this calendar month (by createdAt)
//  *  - recentActivity: top 5 newest items
//  */
// router.get('/stats', auth, async (req, res) => {
//   try {
//     const stylistId = req.user.id;

//     const now = new Date();

//     // 30-day window (for "Recent Visits")
//     const thirtyDaysAgo = new Date(now);
//     thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

//     // Calendar month window (for "Photos This Month")
//     const y = now.getUTCFullYear();
//     const m = now.getUTCMonth();
//     const startOfMonth = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
//     const nextMonthStart = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0));

//     const [totalClients, recentVisits, photosAgg, recentActivity] = await Promise.all([
//       Client.countDocuments({ stylistId }),

//       Visit.countDocuments({
//         stylistId,
//         visitDate: { $gte: thirtyDaysAgo, $lte: now },
//       }),

//       // IMPORTANT: cast stylistId to ObjectId in aggregation
//       Visit.aggregate([
//         {
//           $match: {
//             stylistId: new mongoose.Types.ObjectId(stylistId),
//             createdAt: { $gte: startOfMonth, $lt: nextMonthStart },
//           },
//         },
//         { $project: { photosCount: { $size: { $ifNull: ['$photos', []] } } } },
//         { $group: { _id: null, total: { $sum: '$photosCount' } } },
//       ]),

//       Visit.find({ stylistId })
//         .populate('clientId', 'fullName')
//         .sort({ createdAt: -1, visitDate: -1, _id: -1 })
//         .limit(5)
//         .lean(),
//     ]);

//     res.json({
//       totalClients,
//       recentVisits,
//       photosThisMonth: photosAgg.length ? photosAgg[0].total : 0,
//       recentActivity,
//     });
//   } catch (error) {
//     console.error('GET /dashboard/stats error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// /**
//  * GET /api/dashboard/activity
//  *  - Returns all visits for the stylist (paginated)
//  */
// router.get('/activity', auth, async (req, res) => {
//   try {
//     const stylistId = req.user.id;

//     const rawLimit = Number.parseInt(req.query.limit, 10);
//     const limit = Math.min(Math.max(rawLimit || 20, 1), 50);
//     const page = Math.max(parseInt(req.query.page || '1', 10), 1);
//     const skip = (page - 1) * limit;

//     const { from, to } = req.query;

//     const filter = { stylistId };
//     if (from || to) {
//       filter.visitDate = {};
//       if (from) filter.visitDate.$gte = new Date(from);
//       if (to) filter.visitDate.$lte = new Date(to);
//     }

//     const [total, activities] = await Promise.all([
//       Visit.countDocuments(filter),
//       Visit.find(filter)
//         .populate('clientId', 'fullName')
//         .sort({ createdAt: -1, visitDate: -1, _id: -1 })
//         .skip(skip)
//         .limit(limit)
//         .lean(),
//     ]);

//     const hasMore = page * limit < total;

//     res.json({
//       activities,
//       page,
//       limit,
//       total,
//       hasMore,
//     });
//   } catch (error) {
//     console.error('GET /dashboard/activity error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// module.exports = router;







// backend/routes/dashboard.js
const express = require('express');
const mongoose = require('mongoose');                  // ← needed for ObjectId cast
const Client = require('../models/Client');
const Visit = require('../models/Visit');
const auth = require('./auth').auth;

const router = express.Router();

/**
 * GET /api/dashboard/stats
 *  - totalClients (all time)
 *  - recentVisits (last 30 days by createdAt, day-boundary safe)
 *  - photosThisMonth (calendar month by createdAt)
 *  - recentActivity (latest 5 by createdAt, then visitDate)
 */
router.get('/stats', auth, async (req, res) => {
  try {
    const stylistId = req.user.id;

    const now = new Date();

    // Last 30 days (inclusive), normalized to day boundaries
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Current calendar month (UTC, inclusive start, exclusive next month start)
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const monthStart = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
    const nextMonthStart = new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0));

    const [totalClients, recentVisits, photosAgg, recentActivity] = await Promise.all([
      Client.countDocuments({ stylistId }),

      // Count visits created in the last 30 days (createdAt), TZ-safe
      Visit.countDocuments({
        stylistId,
        createdAt: { $gte: thirtyDaysAgo, $lte: endOfToday },
      }),

      // Sum photos for visits created this calendar month (createdAt)
      // IMPORTANT: cast stylistId to ObjectId for aggregation match
      Visit.aggregate([
        {
          $match: {
            stylistId: new mongoose.Types.ObjectId(stylistId),
            createdAt: { $gte: monthStart, $lt: nextMonthStart },
          },
        },
        { $project: { photosCount: { $size: { $ifNull: ['$photos', []] } } } },
        { $group: { _id: null, total: { $sum: '$photosCount' } } },
      ]),

      // Latest 5
      Visit.find({ stylistId })
        .populate('clientId', 'fullName')
        .sort({ createdAt: -1, visitDate: -1, _id: -1 })
        .limit(5)
        .lean(),
    ]);

    res.json({
      totalClients,
      recentVisits,
      photosThisMonth: photosAgg.length ? photosAgg[0].total : 0,
      recentActivity,
    });
  } catch (error) {
    console.error('GET /dashboard/stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/dashboard/activity
 *  - All visits (optionally filter by visitDate range)
 *  - Paginated
 */
router.get('/activity', auth, async (req, res) => {
  try {
    const stylistId = req.user.id;

    const rawLimit = Number.parseInt(req.query.limit, 10);
    const limit = Math.min(Math.max(rawLimit || 20, 1), 50);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const skip = (page - 1) * limit;

    const { from, to } = req.query;

    const filter = { stylistId };
    if (from || to) {
      filter.visitDate = {};
      if (from) filter.visitDate.$gte = new Date(from);
      if (to) filter.visitDate.$lte = new Date(to);
    }

    const [total, activities] = await Promise.all([
      Visit.countDocuments(filter),
      Visit.find(filter)
        .populate('clientId', 'fullName')
        .sort({ createdAt: -1, visitDate: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const hasMore = page * limit < total;

    res.json({ activities, page, limit, total, hasMore });
  } catch (error) {
    console.error('GET /dashboard/activity error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
