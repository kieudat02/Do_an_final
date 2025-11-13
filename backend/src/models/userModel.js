const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    username: {
        type: String,
        trim: true,
        lowercase: true,
        sparse: true, // Allows null values to not violate unique constraint
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true, // Mongoose unique index
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: function() {
            // Password not required if authenticating via social login
            return !this.googleId && !this.facebookId;
        }
    },
    role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
        required: function() {
            return this.user_type !== 'customer'; // Role is not required for customers
        }
    },
    user_type: {
        type: String,
        enum: ['admin', 'staff', 'customer'],
        default: 'staff'
    },
    avatar: {
        type: String,
        default: ''
    },
    phone: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['Hoạt động', 'Tạm dừng'],
        default: 'Hoạt động'
    },
    // Social authentication fields
    googleId: {
        type: String,
        sparse: true,
        unique: true
    },
    facebookId: {
        type: String,
        sparse: true,
        unique: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    socialProfile: {
        provider: String, // 'google' or 'facebook'
        picture: String,
        locale: String,
        lastLogin: Date
    }
}, {
    timestamps: true
});

// Hash password before save - only if password field is modified
userSchema.pre('save', async function(next) {
    if (!this.isModified('password') || !this.password) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Method to compare password
userSchema.methods.comparePassword = function(candidatePassword) {
    if (!this.password) return Promise.resolve(false);
    return bcrypt.compare(candidatePassword, this.password);
};

// Validate unique email (with custom error message)
userSchema.path('email').validate({
    validator: async function(value) {
        const count = await this.constructor.countDocuments({ email: value, _id: { $ne: this._id } });
        return count === 0;
    },
    message: props => 'Email đã được sử dụng trong hệ thống'
});

// Validate unique username (if provided) with custom error message
userSchema.path('username').validate({
    validator: async function(value) {
        if (!value) return true; // Skip validation if no username
        const count = await this.constructor.countDocuments({ username: value, _id: { $ne: this._id } });
        return count === 0;
    },
    message: props => 'Tên đăng nhập đã được sử dụng trong hệ thống'
});

// Index để tối ưu hóa truy vấn
userSchema.index({ email: 1 });
userSchema.index({ username: 1 }, { sparse: true }); // Sparse index for optional unique field
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ user_type: 1 });
userSchema.index({ googleId: 1 }, { sparse: true });
userSchema.index({ facebookId: 1 }, { sparse: true });

module.exports = mongoose.model('User', userSchema);