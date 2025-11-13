const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const User = require('../models/userModel');
const Role = require('../models/roleModel');
const { generateToken } = require('../utils/jwtUtils');

/**
 * Handle Google authentication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.googleAuth = async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({
                success: false,
                message: 'Google ID token is required'
            });
        }

        // Verify token with Google
        const googleClientId = process.env.GOOGLE_CLIENT_ID;
        if (!googleClientId) {
            console.error('GOOGLE_CLIENT_ID not configured');
            return res.status(500).json({
                success: false,
                message: 'Google authentication not configured'
            });
        }

        const client = new OAuth2Client(googleClientId);
        const ticket = await client.verifyIdToken({
            idToken,
            audience: googleClientId
        });

        // Get user info from verified token
        const payload = ticket.getPayload();
        const { 
            email, 
            name: fullName, 
            picture, 
            sub: googleId,
            locale 
        } = payload;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email not provided by Google'
            });
        }

        // Find or create user
        let user = await User.findOne({ email: email.toLowerCase() });

        if (user) {
            // Update existing user with Google info
            user.googleId = googleId;
            user.isEmailVerified = true;
            user.socialProfile = {
                provider: 'google',
                picture: picture || user.socialProfile?.picture || '',
                locale: locale || user.socialProfile?.locale,
                lastLogin: new Date()
            };
            
            // If user has avatar from social profile and no existing avatar
            if (picture && !user.avatar) {
                user.avatar = picture;
            }
            
            await user.save();
        } else {
            // Find Customer role
            let customerRole = await Role.findOne({ name: 'Customer' });
            if (!customerRole) {
                customerRole = await Role.create({
                    name: 'Customer',
                    description: 'Customer role',
                    level: 4  // Level cao nhất - không có quyền admin
                });
            } else if (customerRole.level <= 3) {
                // Update nếu role cũ có level thấp (có quyền admin)
                customerRole.level = 4;
                await customerRole.save();
            }

            // Create new user
            user = new User({
                email: email.toLowerCase(),
                fullName,
                googleId,
                avatar: picture || '',
                isEmailVerified: true,
                user_type: 'customer',
                role: customerRole._id,
                status: 'Hoạt động',
                socialProfile: {
                    provider: 'google',
                    picture: picture || '',
                    locale,
                    lastLogin: new Date()
                }
            });

            await user.save();
        }

        // Generate JWT
        const token = generateToken(user);

        // Return user and token
        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(200).json({
            success: true,
            message: 'Google authentication successful',
            user: userResponse,
            token
        });
    } catch (error) {
        console.error('Error in Google authentication:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing Google authentication',
            error: error.message
        });
    }
};

/**
 * Handle Facebook authentication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.facebookAuth = async (req, res) => {
    try {
        const { accessToken } = req.body;

        if (!accessToken) {
            return res.status(400).json({
                success: false,
                message: 'Facebook access token is required'
            });
        }

        // Verify token with Facebook
        const fbFields = 'id,name,email,picture';
        const response = await axios.get(
            `https://graph.facebook.com/me?fields=${fbFields}&access_token=${accessToken}`
        );

        const { id: facebookId, name: fullName, email, picture } = response.data;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email not provided by Facebook',
                details: 'User must grant email permission to the app'
            });
        }

        // Find or create user
        let user = await User.findOne({ email: email.toLowerCase() });

        if (user) {
            // Update existing user with Facebook info
            user.facebookId = facebookId;
            user.isEmailVerified = true;
            user.socialProfile = {
                provider: 'facebook',
                picture: picture?.data?.url || user.socialProfile?.picture || '',
                lastLogin: new Date()
            };

            // If user has avatar from social profile and no existing avatar
            if (picture?.data?.url && !user.avatar) {
                user.avatar = picture.data.url;
            }
            
            await user.save();
        } else {
            // Find Customer role
            let customerRole = await Role.findOne({ name: 'Customer' });
            if (!customerRole) {
                customerRole = await Role.create({
                    name: 'Customer',
                    description: 'Customer role',
                    level: 0
                });
            }

            // Create new user
            user = new User({
                email: email.toLowerCase(),
                fullName,
                facebookId,
                avatar: picture?.data?.url || '',
                isEmailVerified: true,
                user_type: 'customer',
                role: customerRole._id,
                status: 'Hoạt động',
                socialProfile: {
                    provider: 'facebook',
                    picture: picture?.data?.url || '',
                    lastLogin: new Date()
                }
            });

            await user.save();
        }

        // Generate JWT
        const token = generateToken(user);

        // Return user and token
        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(200).json({
            success: true,
            message: 'Facebook authentication successful',
            user: userResponse,
            token
        });
    } catch (error) {
        console.error('Error in Facebook authentication:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing Facebook authentication',
            error: error.message
        });
    }
}; 