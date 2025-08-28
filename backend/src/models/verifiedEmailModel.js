const mongoose = require('mongoose');

const verifiedEmailSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    verifiedAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: function() {
            // Verification valid for 7 days for account creation
            const date = new Date();
            date.setDate(date.getDate() + 7);
            return date;
        }
    }
});

// Create index for faster lookups
verifiedEmailSchema.index({ email: 1 }, { unique: true });
verifiedEmailSchema.index({ expiresAt: 1 });

// Method to check if verification is expired
verifiedEmailSchema.methods.isExpired = function() {
    return this.expiresAt < new Date();
};

module.exports = mongoose.model('VerifiedEmail', verifiedEmailSchema); 