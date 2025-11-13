const ConversationContextService = require('../services/conversationContextService');
const UserPreference = require('../models/userPreferenceModel');

/**
 * Lấy conversation context cho session
 */
exports.getContext = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { userIdentifier } = req.query;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'SessionId là bắt buộc'
            });
        }

        const context = await ConversationContextService.getConversationContext(
            sessionId,
            userIdentifier
        );

        return res.status(200).json({
            success: true,
            data: context
        });

    } catch (error) {
        console.error('Get Context Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi lấy context'
        });
    }
};

/**
 * Lấy user preferences
 */
exports.getUserPreferences = async (req, res) => {
    try {
        const { userIdentifier } = req.params;

        if (!userIdentifier) {
            return res.status(400).json({
                success: false,
                error: 'UserIdentifier là bắt buộc'
            });
        }

        const userPref = await UserPreference.findOne({
            userIdentifier,
            isActive: true
        });

        if (!userPref) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy user preferences'
            });
        }

        const summary = userPref.getPreferenceSummary();

        return res.status(200).json({
            success: true,
            data: {
                userIdentifier,
                preferences: userPref.preferences,
                interactions: userPref.interactions,
                aiLearning: userPref.aiLearning,
                summary
            }
        });

    } catch (error) {
        console.error('Get User Preferences Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi lấy preferences'
        });
    }
};

/**
 * Update user preferences manually
 */
exports.updateUserPreferences = async (req, res) => {
    try {
        const { userIdentifier } = req.params;
        const { preferences } = req.body;

        if (!userIdentifier) {
            return res.status(400).json({
                success: false,
                error: 'UserIdentifier là bắt buộc'
            });
        }

        if (!preferences || typeof preferences !== 'object') {
            return res.status(400).json({
                success: false,
                error: 'Preferences là bắt buộc và phải là object'
            });
        }

        const userPref = await UserPreference.findOrCreate(userIdentifier);

        // Update các preferences được cung cấp
        if (preferences.destination) {
            await userPref.updateDestinationPreference(preferences.destination);
        }

        if (preferences.budgetMin || preferences.budgetMax) {
            await userPref.updateBudgetRange(
                preferences.budgetMin,
                preferences.budgetMax
            );
        }

        if (preferences.travelStyle) {
            await userPref.updateTravelStyle(preferences.travelStyle);
        }

        if (preferences.duration) {
            userPref.preferences.preferredDuration = {
                min: preferences.duration.min || 2,
                max: preferences.duration.max || 7
            };
            await userPref.save();
        }

        return res.status(200).json({
            success: true,
            data: {
                message: 'Đã cập nhật preferences thành công',
                preferences: userPref.preferences
            }
        });

    } catch (error) {
        console.error('Update User Preferences Error:', error);
        console.error('Error stack:', error.stack);
        return res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi cập nhật preferences',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Record tour view
 */
exports.recordTourView = async (req, res) => {
    try {
        const { userIdentifier } = req.params;
        const { tourId, tourName } = req.body;

        if (!userIdentifier || !tourId || !tourName) {
            return res.status(400).json({
                success: false,
                error: 'UserIdentifier, tourId và tourName là bắt buộc'
            });
        }

        const userPref = await UserPreference.findOrCreate(userIdentifier);
        await userPref.addTourView(tourId, tourName);

        return res.status(200).json({
            success: true,
            message: 'Đã ghi nhận lượt xem tour'
        });

    } catch (error) {
        console.error('Record Tour View Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi ghi nhận lượt xem'
        });
    }
};

/**
 * Record feedback
 */
exports.recordFeedback = async (req, res) => {
    try {
        const { userIdentifier } = req.params;
        const { feedbackType } = req.body; // 'positive', 'negative', 'neutral'

        if (!userIdentifier || !feedbackType) {
            return res.status(400).json({
                success: false,
                error: 'UserIdentifier và feedbackType là bắt buộc'
            });
        }

        if (!['positive', 'negative', 'neutral'].includes(feedbackType)) {
            return res.status(400).json({
                success: false,
                error: 'FeedbackType phải là positive, negative hoặc neutral'
            });
        }

        const userPref = await UserPreference.findOrCreate(userIdentifier);
        await userPref.recordFeedback(feedbackType);

        return res.status(200).json({
            success: true,
            message: 'Đã ghi nhận feedback',
            data: {
                satisfactionScore: userPref.aiLearning.satisfactionScore,
                feedbackCount: userPref.aiLearning.feedbackCount
            }
        });

    } catch (error) {
        console.error('Record Feedback Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi ghi nhận feedback'
        });
    }
};

/**
 * Clear conversation context
 */
exports.clearContext = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'SessionId là bắt buộc'
            });
        }

        const result = await ConversationContextService.clearContext(sessionId);

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: 'Đã xóa context thành công'
            });
        } else {
            return res.status(500).json({
                success: false,
                error: result.error
            });
        }

    } catch (error) {
        console.error('Clear Context Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi xóa context'
        });
    }
};

/**
 * Get session statistics
 */
exports.getSessionStats = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'SessionId là bắt buộc'
            });
        }

        const stats = await ConversationContextService.getSessionStats(sessionId);

        if (!stats) {
            return res.status(404).json({
                success: false,
                error: 'Không tìm thấy session'
            });
        }

        return res.status(200).json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Get Session Stats Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi lấy thống kê'
        });
    }
};

/**
 * Get short-term memory
 */
exports.getShortTermMemory = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: 'SessionId là bắt buộc'
            });
        }

        const memory = await ConversationContextService.getShortTermMemory(sessionId);

        return res.status(200).json({
            success: true,
            data: {
                sessionId,
                messages: memory,
                count: memory.length
            }
        });

    } catch (error) {
        console.error('Get Short-Term Memory Error:', error);
        return res.status(500).json({
            success: false,
            error: 'Có lỗi xảy ra khi lấy short-term memory'
        });
    }
};