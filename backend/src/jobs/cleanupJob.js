const cron = require('node-cron');
const { cleanupExpiredOrders } = require('../services/transactionService');

/**
 * Scheduled job để cleanup expired orders
 */

class CleanupJob {
    constructor() {
        this.isRunning = false;
        this.stats = { totalRuns: 0, totalCleaned: 0, lastError: null };
    }

    start() {
        console.log('🚀 Starting cleanup job...');

        const schedule = process.env.CLEANUP_SCHEDULE || '0 */15 * * * *';

        this.job = cron.schedule(schedule, async () => {
            await this.runCleanup();
        }, { scheduled: true, timezone: "Asia/Ho_Chi_Minh" });

        console.log(`✅ Cleanup job scheduled: ${schedule}`);

        if (process.env.RUN_CLEANUP_ON_START === 'true') {
            setTimeout(() => this.runCleanup(), 5000);
        }
    }

    /**
     * Dừng scheduled job
     */
    stop() {
        if (this.job) {
            this.job.stop();
            console.log('🛑 Cleanup job stopped');
        }
    }

    /**
     * Chạy cleanup process
     */
    async runCleanup() {
        if (this.isRunning) {
            console.log('⚠️ Cleanup job is already running, skipping...');
            return;
        }

        this.isRunning = true;
        const startTime = new Date();
        
        try {
            console.log(`🧹 Running cleanup job at ${startTime.toISOString()}`);
            
            const result = await cleanupExpiredOrders();
            
            if (result.success) {
                this.stats.totalRuns++;
                this.stats.totalCleaned += result.cleanedCount;
                this.lastRun = startTime;
                
                const duration = new Date() - startTime;
                console.log(`✅ Cleanup job completed in ${duration}ms`);
                console.log(`📊 Cleaned ${result.cleanedCount} orders (Total: ${this.stats.totalCleaned})`);
                
                // Log stats mỗi 10 lần chạy
                if (this.stats.totalRuns % 10 === 0) {
                    this.logStats();
                }
                
            } else {
                this.stats.lastError = result.error;
                console.error('❌ Cleanup job failed:', result.error);
            }
            
        } catch (error) {
            this.stats.lastError = error.message;
            console.error('❌ Cleanup job error:', error);
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Chạy cleanup thủ công
     */
    async runManualCleanup() {
        console.log('🔧 Running manual cleanup...');
        await this.runCleanup();
    }

    /**
     * Lấy thống kê job
     */
    getStats() {
        return {
            isRunning: this.isRunning,
            lastRun: this.lastRun,
            nextRun: this.job ? this.job.nextDate() : null,
            stats: this.stats,
            schedule: this.job ? this.job.options.scheduled : false
        };
    }

    /**
     * Log thống kê
     */
    logStats() {
        console.log('📊 Cleanup Job Statistics:');
        console.log(`   Total runs: ${this.stats.totalRuns}`);
        console.log(`   Total cleaned: ${this.stats.totalCleaned}`);
        console.log(`   Last run: ${this.lastRun ? this.lastRun.toISOString() : 'Never'}`);
        console.log(`   Last error: ${this.stats.lastError || 'None'}`);
        console.log(`   Currently running: ${this.isRunning}`);
    }

    /**
     * Reset stats
     */
    resetStats() {
        this.stats = {
            totalRuns: 0,
            totalCleaned: 0,
            lastError: null
        };
        console.log('📊 Cleanup job stats reset');
    }
}

// Singleton instance
const cleanupJob = new CleanupJob();

/**
 * Khởi tạo cleanup job
 */
const initializeCleanupJob = () => {
    // Chỉ chạy nếu không phải test environment
    if (process.env.NODE_ENV !== 'test') {
        cleanupJob.start();
        
        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('🛑 Shutting down cleanup job...');
            cleanupJob.stop();
        });
        
        process.on('SIGTERM', () => {
            console.log('🛑 Shutting down cleanup job...');
            cleanupJob.stop();
        });
    }
};

/**
 * API endpoints cho cleanup job management
 */
const getCleanupJobRoutes = (router) => {
    // Lấy thống kê job
    router.get('/cleanup/stats', (req, res) => {
        const stats = cleanupJob.getStats();
        res.json({
            success: true,
            data: stats
        });
    });

    // Chạy cleanup thủ công
    router.post('/cleanup/run', async (req, res) => {
        try {
            await cleanupJob.runManualCleanup();
            res.json({
                success: true,
                message: 'Manual cleanup completed'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Manual cleanup failed',
                error: error.message
            });
        }
    });

    // Reset stats
    router.post('/cleanup/reset-stats', (req, res) => {
        cleanupJob.resetStats();
        res.json({
            success: true,
            message: 'Stats reset successfully'
        });
    });

    // Start/Stop job
    router.post('/cleanup/start', (req, res) => {
        cleanupJob.start();
        res.json({
            success: true,
            message: 'Cleanup job started'
        });
    });

    router.post('/cleanup/stop', (req, res) => {
        cleanupJob.stop();
        res.json({
            success: true,
            message: 'Cleanup job stopped'
        });
    });

    return router;
};

module.exports = {
    cleanupJob,
    initializeCleanupJob,
    getCleanupJobRoutes
};
