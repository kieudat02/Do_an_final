const mongoose = require('mongoose');

/**
 * User Preference Model - lưu trữ sở thích và lịch sử tương tác của user
 * Giúp AI cá nhân hóa trải nghiệm qua nhiều phiên chat
 */
const userPreferenceSchema = new mongoose.Schema({
    // User identifier
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    userIdentifier: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Travel preferences
    preferences: {
        // Điểm đến yêu thích
        favoriteDestinations: [{
            name: String,
            visitCount: { type: Number, default: 1 },
            lastVisited: { type: Date, default: Date.now }
        }],

        // Ngân sách ưa thích
        budgetRange: {
            min: { type: Number, default: 0 },
            max: { type: Number, default: 10000000 },
            currency: { type: String, default: 'VND' }
        },

        // Phong cách du lịch
        travelStyle: {
            type: String,
            default: null
        },

        // Thời gian ưa thích
        preferredDuration: {
            min: { type: Number, default: 2 }, // ngày
            max: { type: Number, default: 7 }
        },

        // Topics quan tâm
        interestedTopics: [{
            name: String,
            interestLevel: { type: Number, default: 1, min: 1, max: 5 }
        }],

        // Seasons
        preferredSeasons: [{
            type: String,
            enum: ['spring', 'summer', 'autumn', 'winter']
        }],

        // Activities
        preferredActivities: [String],

        // Food preferences
        foodPreferences: [String],

        // Accommodation preferences
        accommodationPreferences: {
            type: String,
            enum: ['budget', 'standard', 'luxury', 'mixed'],
            default: 'standard'
        }
    },

    // Interaction history
    interactions: {
        totalSessions: { type: Number, default: 0 },
        totalMessages: { type: Number, default: 0 },
        lastInteraction: { type: Date, default: Date.now },
        firstInteraction: { type: Date, default: Date.now },

        // Intent history
        intentHistory: [{
            intent: String,
            count: Number,
            lastOccurrence: Date
        }],

        // Tours viewed/inquired
        toursViewed: [{
            tourId: mongoose.Schema.Types.ObjectId,
            tourName: String,
            viewCount: { type: Number, default: 1 },
            lastViewed: { type: Date, default: Date.now }
        }],

        // Tours booked
        toursBooked: [{
            tourId: mongoose.Schema.Types.ObjectId,
            tourName: String,
            bookedAt: Date
        }]
    },

    // AI Learning data
    aiLearning: {
        // Conversation patterns
        commonQuestions: [{
            question: String,
            frequency: Number
        }],

        // Response satisfaction
        satisfactionScore: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },

        // Feedback count
        feedbackCount: {
            positive: { type: Number, default: 0 },
            negative: { type: Number, default: 0 },
            neutral: { type: Number, default: 0 }
        }
    },

    // Metadata
    metadata: {
        deviceType: String,
        browserInfo: String,
        location: String,
        timezone: String,
        language: { type: String, default: 'vi' }
    },

    isActive: {
        type: Boolean,
        default: true
    }

}, {
    timestamps: true
});

// Indexes
userPreferenceSchema.index({ userIdentifier: 1, isActive: 1 });
userPreferenceSchema.index({ userId: 1, isActive: 1 });
userPreferenceSchema.index({ 'interactions.lastInteraction': -1 });

// Static method: Find or create user preference
userPreferenceSchema.statics.findOrCreate = async function(userIdentifier, userId = null) {
    let preference = await this.findOne({ userIdentifier, isActive: true });

    if (!preference) {
        preference = new this({
            userIdentifier,
            userId,
            'interactions.firstInteraction': new Date()
        });
        await preference.save();
    }

    return preference;
};

// Method: Update destination preference
userPreferenceSchema.methods.updateDestinationPreference = async function(destinationName) {
    const existing = this.preferences.favoriteDestinations.find(
        d => d.name.toLowerCase() === destinationName.toLowerCase()
    );

    if (existing) {
        existing.visitCount += 1;
        existing.lastVisited = new Date();
    } else {
        this.preferences.favoriteDestinations.push({
            name: destinationName,
            visitCount: 1,
            lastVisited: new Date()
        });
    }

    return this.save();
};

// Method: Update budget range
userPreferenceSchema.methods.updateBudgetRange = async function(min, max) {
    if (min) this.preferences.budgetRange.min = min;
    if (max) this.preferences.budgetRange.max = max;
    return this.save();
};

// Method: Update travel style
userPreferenceSchema.methods.updateTravelStyle = async function(style) {
    if (style) {
        this.preferences.travelStyle = style;
    }
    return this.save();
};

// Method: Add tour view
userPreferenceSchema.methods.addTourView = async function(tourId, tourName) {
    const existing = this.interactions.toursViewed.find(
        t => t.tourId.toString() === tourId.toString()
    );

    if (existing) {
        existing.viewCount += 1;
        existing.lastViewed = new Date();
    } else {
        this.interactions.toursViewed.push({
            tourId,
            tourName,
            viewCount: 1,
            lastViewed: new Date()
        });
    }

    return this.save();
};

// Method: Record intent
userPreferenceSchema.methods.recordIntent = async function(intent) {
    const existing = this.interactions.intentHistory.find(
        i => i.intent === intent
    );

    if (existing) {
        existing.count += 1;
        existing.lastOccurrence = new Date();
    } else {
        this.interactions.intentHistory.push({
            intent,
            count: 1,
            lastOccurrence: new Date()
        });
    }

    return this.save();
};

// Method: Update interaction stats
userPreferenceSchema.methods.updateInteractionStats = async function() {
    this.interactions.totalSessions += 1;
    this.interactions.lastInteraction = new Date();
    return this.save();
};

// Method: Add message count
userPreferenceSchema.methods.incrementMessageCount = async function() {
    this.interactions.totalMessages += 1;
    return this.save();
};

// Method: Record feedback
userPreferenceSchema.methods.recordFeedback = async function(feedbackType) {
    if (feedbackType === 'positive') {
        this.aiLearning.feedbackCount.positive += 1;
    } else if (feedbackType === 'negative') {
        this.aiLearning.feedbackCount.negative += 1;
    } else {
        this.aiLearning.feedbackCount.neutral += 1;
    }

    // Update satisfaction score
    const total = this.aiLearning.feedbackCount.positive +
                  this.aiLearning.feedbackCount.negative +
                  this.aiLearning.feedbackCount.neutral;

    if (total > 0) {
        this.aiLearning.satisfactionScore =
            (this.aiLearning.feedbackCount.positive * 5 +
             this.aiLearning.feedbackCount.neutral * 3) / total;
    }

    return this.save();
};

// Method: Get preference summary
userPreferenceSchema.methods.getPreferenceSummary = function() {
    return {
        destinations: this.preferences.favoriteDestinations
            .sort((a, b) => b.visitCount - a.visitCount)
            .slice(0, 5),
        budgetRange: this.preferences.budgetRange,
        travelStyle: this.preferences.travelStyle,
        totalInteractions: this.interactions.totalSessions,
        satisfactionScore: this.aiLearning.satisfactionScore,
        topIntents: this.interactions.intentHistory
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map(i => i.intent)
    };
};

// Pre-save middleware
userPreferenceSchema.pre('save', function(next) {
    this.interactions.lastInteraction = new Date();
    next();
});

module.exports = mongoose.model('UserPreference', userPreferenceSchema);