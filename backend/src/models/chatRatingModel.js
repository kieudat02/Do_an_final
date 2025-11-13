// const mongoose = require('mongoose');

// const chatRatingSchema = new mongoose.Schema({
//     sessionId: {
//         type: String,
//         required: true,
//         unique: true,
//         index: true,
//         trim: true
//     },
//     rating: {
//         type: Number,
//         required: true,
//         min: 1,
//         max: 5,
//         validate: {
//             validator: function(v) {
//                 return Number.isInteger(v) && v >= 1 && v <= 5;
//             },
//             message: 'Rating phải là số nguyên từ 1 đến 5'
//         }
//     },
//     feedback: {
//         type: String,
//         trim: true,
//         maxlength: 1000,
//         default: ''
//     },
//     userIP: {
//         type: String,
//         trim: true,
//         default: ''
//     },
//     ratingType: {
//         type: String,
//         enum: ['session_end', 'problem_solved', 'manual'],
//         default: 'manual',
//         index: true
//     },
//     userAgent: {
//         type: String,
//         trim: true,
//         default: ''
//     },
//     createdAt: {
//         type: Date,
//         default: Date.now,
//         index: true
//     },
//     updatedAt: {
//         type: Date,
//         default: Date.now
//     },
//     status: {
//         type: String,
//         enum: ['active', 'hidden', 'deleted'],
//         default: 'active',
//         index: true
//     },
//     sessionStats: {
//         totalMessages: { type: Number, min: 0, default: 0 },
//         userMessages: { type: Number, min: 0, default: 0 },
//         botMessages: { type: Number, min: 0, default: 0 },
//         sessionDuration: { type: Number, min: 0, default: 0 },
//         avgResponseTime: { type: Number, min: 0, default: 0 },
//         problemSolved: { type: Boolean, default: false },
//         mainTopics: [{ type: String, trim: true }],
//         tourInfoProvided: { type: Boolean, default: false }
//     }
// }, {
//     timestamps: true,
//     collection: 'chat_ratings'
// });

// chatRatingSchema.index({ sessionId: 1, messageId: 1 }, { unique: true });
// chatRatingSchema.index({ createdAt: -1 });
// chatRatingSchema.index({ rating: 1 });
// chatRatingSchema.index({ status: 1, createdAt: -1 });

// chatRatingSchema.virtual('csatCategory').get(function() {
//     if (this.rating >= 4) return 'satisfied';
//     if (this.rating === 3) return 'neutral';
//     return 'dissatisfied';
// });

// chatRatingSchema.statics.getCSATStats = async function(dateFrom, dateTo, sessionId = null) {
//     const matchConditions = {
//         status: 'active',
//         createdAt: {
//             $gte: dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
//             $lte: dateTo || new Date()
//         }
//     };

//     if (sessionId) {
//         matchConditions.sessionId = sessionId;
//     }

//     const stats = await this.aggregate([
//         { $match: matchConditions },
//         {
//             $group: {
//                 _id: null,
//                 totalRatings: { $sum: 1 },
//                 averageRating: { $avg: '$rating' },
//                 rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
//                 rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
//                 rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
//                 rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
//                 rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
//                 satisfied: { $sum: { $cond: [{ $gte: ['$rating', 4] }, 1, 0] } },
//                 neutral: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
//                 dissatisfied: { $sum: { $cond: [{ $lte: ['$rating', 2] }, 1, 0] } }
//             }
//         }
//     ]);

//     if (stats.length === 0) {
//         return {
//             totalRatings: 0,
//             averageRating: 0,
//             csatScore: 0,
//             distribution: { rating1: 0, rating2: 0, rating3: 0, rating4: 0, rating5: 0 },
//             satisfaction: { satisfied: 0, neutral: 0, dissatisfied: 0 },
//             percentages: { satisfied: 0, neutral: 0, dissatisfied: 0 }
//         };
//     }

//     const result = stats[0];
//     const csatScore = result.totalRatings > 0 ? (result.satisfied / result.totalRatings) * 100 : 0;

//     return {
//         totalRatings: result.totalRatings,
//         averageRating: Math.round(result.averageRating * 100) / 100,
//         csatScore: Math.round(csatScore * 100) / 100,
//         distribution: {
//             rating1: result.rating1,
//             rating2: result.rating2,
//             rating3: result.rating3,
//             rating4: result.rating4,
//             rating5: result.rating5
//         },
//         satisfaction: {
//             satisfied: result.satisfied,
//             neutral: result.neutral,
//             dissatisfied: result.dissatisfied
//         },
//         percentages: {
//             satisfied: Math.round((result.satisfied / result.totalRatings) * 10000) / 100,
//             neutral: Math.round((result.neutral / result.totalRatings) * 10000) / 100,
//             dissatisfied: Math.round((result.dissatisfied / result.totalRatings) * 10000) / 100
//         }
//     };
// };

// chatRatingSchema.statics.getRatingTrend = async function(days = 7) {
//     const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

//     const trend = await this.aggregate([
//         {
//             $match: {
//                 status: 'active',
//                 createdAt: { $gte: startDate }
//             }
//         },
//         {
//             $group: {
//                 _id: {
//                     year: { $year: '$createdAt' },
//                     month: { $month: '$createdAt' },
//                     day: { $dayOfMonth: '$createdAt' }
//                 },
//                 averageRating: { $avg: '$rating' },
//                 totalRatings: { $sum: 1 },
//                 satisfied: { $sum: { $cond: [{ $gte: ['$rating', 4] }, 1, 0] } }
//             }
//         },
//         {
//             $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
//         }
//     ]);

//     return trend.map(item => ({
//         date: new Date(item._id.year, item._id.month - 1, item._id.day),
//         averageRating: Math.round(item.averageRating * 100) / 100,
//         totalRatings: item.totalRatings,
//         csatScore: item.totalRatings > 0 ? Math.round((item.satisfied / item.totalRatings) * 10000) / 100 : 0
//     }));
// };

// chatRatingSchema.pre('save', function(next) {
//     if (this.isModified() && !this.isNew) {
//         this.updatedAt = new Date();
//     }
//     next();
// });

// const ChatRating = mongoose.model('ChatRating', chatRatingSchema);
// module.exports = ChatRating;
