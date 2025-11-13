const mongoose = require('mongoose');

const chatHistorySchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    userIdentifier: {
        type: String,
        default: null,
        index: true
    },
    messages: [{
        role: {
            type: String,
            enum: ['user', 'assistant'],
            required: true
        },
        content: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    totalMessages: {
        type: Number,
        default: 0
    },
    metadata: {
        userAgent: String,
        ipAddress: String,
        referrer: String,
        deviceType: String,
        browserInfo: String
    }
}, {
    timestamps: true
});

// Indexes for better performance
chatHistorySchema.index({ sessionId: 1, createdAt: -1 });
chatHistorySchema.index({ userId: 1, lastActivity: -1 });
chatHistorySchema.index({ userIdentifier: 1, lastActivity: -1 });
chatHistorySchema.index({ lastActivity: -1 });

// Virtual for message count
chatHistorySchema.virtual('messageCount').get(function() {
    return this.messages.length;
});

// Method to add a message
chatHistorySchema.methods.addMessage = function(role, content, metadata = {}) {
    this.messages.push({
        role,
        content,
        timestamp: new Date(),
        metadata
    });
    this.totalMessages = this.messages.length;
    this.lastActivity = new Date();
    return this.save();
};

// Method to get recent messages
chatHistorySchema.methods.getRecentMessages = function(limit = 50) {
    return this.messages.slice(-limit);
};

// Method to clear old messages (keep only recent ones)
chatHistorySchema.methods.clearOldMessages = function(keepCount = 100) {
    if (this.messages.length > keepCount) {
        this.messages = this.messages.slice(-keepCount);
        this.totalMessages = this.messages.length;
        return this.save();
    }
    return Promise.resolve(this);
};

// Static method to find or create session
chatHistorySchema.statics.findOrCreateSession = async function(sessionId, userInfo = {}) {
    let session = await this.findOne({ sessionId, isActive: true });
    
    if (!session) {
        session = new this({
            sessionId,
            userId: userInfo.userId || null,
            userIdentifier: userInfo.userIdentifier || null,
            metadata: {
                userAgent: userInfo.userAgent || null,
                ipAddress: userInfo.ipAddress || null,
                referrer: userInfo.referrer || null,
                deviceType: userInfo.deviceType || null,
                browserInfo: userInfo.browserInfo || null
            }
        });
        await session.save();
    } else {
        // Update last activity
        session.lastActivity = new Date();
        await session.save();
    }
    
    return session;
};

// Static method to get user's chat history
chatHistorySchema.statics.getUserHistory = async function(userId, limit = 10) {
    return this.find({ 
        userId, 
        isActive: true 
    })
    .sort({ lastActivity: -1 })
    .limit(limit)
    .select('sessionId lastActivity totalMessages createdAt')
    .lean();
};

// Static method to cleanup old sessions
chatHistorySchema.statics.cleanupOldSessions = async function(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await this.updateMany(
        { 
            lastActivity: { $lt: cutoffDate },
            isActive: true 
        },
        { 
            isActive: false 
        }
    );
    
    return result;
};

// Pre-save middleware to update lastActivity
chatHistorySchema.pre('save', function(next) {
    if (this.isModified('messages')) {
        this.lastActivity = new Date();
        this.totalMessages = this.messages.length;
    }
    next();
});

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
