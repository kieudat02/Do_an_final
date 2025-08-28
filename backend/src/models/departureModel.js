const mongoose = require('mongoose');

const departureSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, unique: true, sparse: true },
    fullSlug: { type: String, unique: true, sparse: true },
    description: { type: String, trim: true },
    status: { type: String, default: 'Hoạt động' },
    createdBy: { type: String, default: 'System' },
    updatedBy: { type: String, default: 'System' },
}, {
    timestamps: true
});

// Add indexes for better search performance
departureSchema.index({ name: 'text', description: 'text' });
departureSchema.index({ status: 1 });
departureSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Departure', departureSchema);