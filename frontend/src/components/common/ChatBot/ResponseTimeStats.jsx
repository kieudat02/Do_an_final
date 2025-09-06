import React, { useState, useEffect } from 'react';
import { useResponseTimeTracking } from '../../../utils/responseTimeTracker';
import './ResponseTimeStats.scss';

/**
 * Component hiển thị thống kê response time của chatbot
 */
const ResponseTimeStats = ({ 
    sessionId = null, 
    autoRefresh = true, 
    refreshInterval = 30000, // 30 seconds
    showTrend = true,
    compact = false 
}) => {
    const [stats, setStats] = useState(null);
    const [trend, setTrend] = useState([]);
    const [isVisible, setIsVisible] = useState(false);
    const [timeRange, setTimeRange] = useState(30); // minutes

    const { getStats, getTrend, exportData, clear } = useResponseTimeTracking();

    // Load stats
    const loadStats = () => {
        const filters = {
            timeRange,
            ...(sessionId && { sessionId })
        };

        const currentStats = getStats(filters);
        setStats(currentStats);

        if (showTrend) {
            const currentTrend = getTrend(5); // 5-minute intervals
            setTrend(currentTrend);
        }
    };

    // Auto refresh
    useEffect(() => {
        if (autoRefresh && isVisible) {
            const interval = setInterval(loadStats, refreshInterval);
            return () => clearInterval(interval);
        }
    }, [autoRefresh, isVisible, refreshInterval, timeRange, sessionId]);

    // Load initial data
    useEffect(() => {
        if (isVisible) {
            loadStats();
        }
    }, [isVisible, timeRange, sessionId]);

    // Format time
    const formatTime = (ms) => {
        if (ms < 1000) return `${Math.round(ms)}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    };

    // Get performance color
    const getPerformanceColor = (responseTime) => {
        if (responseTime < 1000) return 'excellent';
        if (responseTime < 2000) return 'good';
        if (responseTime < 3000) return 'fair';
        return 'poor';
    };

    // Export data
    const handleExport = () => {
        const data = exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chatbot-response-times-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (compact) {
        return (
            <div className="response-time-stats compact">
                <button 
                    className="stats-toggle"
                    onClick={() => setIsVisible(!isVisible)}
                    title="Xem thống kê response time"
                >
                    ⏱️ {stats ? formatTime(stats.averageResponseTime) : '---'}
                </button>

                {isVisible && stats && (
                    <div className="stats-popup">
                        <div className="stats-header">
                            <span>Response Time Stats</span>
                            <button onClick={() => setIsVisible(false)}>×</button>
                        </div>
                        <div className="stats-content">
                            <div className="stat-item">
                                <span className="label">Avg:</span>
                                <span className={`value ${getPerformanceColor(stats.averageResponseTime)}`}>
                                    {formatTime(stats.averageResponseTime)}
                                </span>
                            </div>
                            <div className="stat-item">
                                <span className="label">P95:</span>
                                <span className={`value ${getPerformanceColor(stats.p95)}`}>
                                    {formatTime(stats.p95)}
                                </span>
                            </div>
                            <div className="stat-item">
                                <span className="label">Success:</span>
                                <span className="value">{stats.successRate}%</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="response-time-stats">
            <div className="stats-header">
                <h3>Response Time Statistics</h3>
                <div className="stats-controls">
                    <select 
                        value={timeRange} 
                        onChange={(e) => setTimeRange(Number(e.target.value))}
                        className="time-range-select"
                    >
                        <option value={5}>Last 5 minutes</option>
                        <option value={15}>Last 15 minutes</option>
                        <option value={30}>Last 30 minutes</option>
                        <option value={60}>Last 1 hour</option>
                        <option value={180}>Last 3 hours</option>
                    </select>
                    <button onClick={loadStats} className="refresh-btn">
                        🔄 Refresh
                    </button>
                    <button onClick={handleExport} className="export-btn">
                        📊 Export
                    </button>
                    <button onClick={clear} className="clear-btn">
                        🗑️ Clear
                    </button>
                </div>
            </div>

            {stats ? (
                <div className="stats-content">
                    {/* Overview Stats */}
                    <div className="stats-overview">
                        <div className="stat-card">
                            <div className="stat-label">Total Requests</div>
                            <div className="stat-value">{stats.totalRequests}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Success Rate</div>
                            <div className={`stat-value ${stats.successRate >= 95 ? 'excellent' : stats.successRate >= 90 ? 'good' : 'poor'}`}>
                                {stats.successRate}%
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Average Time</div>
                            <div className={`stat-value ${getPerformanceColor(stats.averageResponseTime)}`}>
                                {formatTime(stats.averageResponseTime)}
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">P95</div>
                            <div className={`stat-value ${getPerformanceColor(stats.p95)}`}>
                                {formatTime(stats.p95)}
                            </div>
                        </div>
                    </div>

                    {/* Detailed Stats */}
                    <div className="stats-detailed">
                        <div className="stats-row">
                            <div className="stat-item">
                                <span className="label">Min Response Time:</span>
                                <span className="value excellent">{formatTime(stats.minResponseTime)}</span>
                            </div>
                            <div className="stat-item">
                                <span className="label">Max Response Time:</span>
                                <span className={`value ${getPerformanceColor(stats.maxResponseTime)}`}>
                                    {formatTime(stats.maxResponseTime)}
                                </span>
                            </div>
                        </div>
                        <div className="stats-row">
                            <div className="stat-item">
                                <span className="label">P50 (Median):</span>
                                <span className={`value ${getPerformanceColor(stats.p50)}`}>
                                    {formatTime(stats.p50)}
                                </span>
                            </div>
                            <div className="stat-item">
                                <span className="label">P99:</span>
                                <span className={`value ${getPerformanceColor(stats.p99)}`}>
                                    {formatTime(stats.p99)}
                                </span>
                            </div>
                        </div>
                        <div className="stats-row">
                            <div className="stat-item">
                                <span className="label">Failed Requests:</span>
                                <span className={`value ${stats.failedRequests > 0 ? 'poor' : 'excellent'}`}>
                                    {stats.failedRequests}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Trend Chart (Simple) */}
                    {showTrend && trend.length > 0 && (
                        <div className="stats-trend">
                            <h4>Response Time Trend</h4>
                            <div className="trend-chart">
                                {trend.map((point, index) => (
                                    <div 
                                        key={index} 
                                        className="trend-point"
                                        style={{
                                            height: `${Math.min((point.averageResponseTime / 5000) * 100, 100)}%`,
                                            backgroundColor: point.averageResponseTime < 1000 ? '#10b981' : 
                                                           point.averageResponseTime < 2000 ? '#f59e0b' : '#ef4444'
                                        }}
                                        title={`${point.timestamp.toLocaleTimeString()}: ${formatTime(point.averageResponseTime)}`}
                                    />
                                ))}
                            </div>
                            <div className="trend-labels">
                                <span>5min intervals</span>
                                <span>Max: 5s</span>
                            </div>
                        </div>
                    )}

                    {/* Recent Requests */}
                    {stats.requests && stats.requests.length > 0 && (
                        <div className="recent-requests">
                            <h4>Recent Requests</h4>
                            <div className="requests-list">
                                {stats.requests.slice(-5).map((req, index) => (
                                    <div key={index} className="request-item">
                                        <span className="request-time">
                                            {req.timestamp.toLocaleTimeString()}
                                        </span>
                                        <span className={`request-duration ${getPerformanceColor(req.responseTime)}`}>
                                            {formatTime(req.responseTime)}
                                        </span>
                                        <span className={`request-status ${req.success ? 'success' : 'error'}`}>
                                            {req.success ? '✅' : '❌'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="stats-loading">
                    <div className="loading-spinner"></div>
                    <span>Loading statistics...</span>
                </div>
            )}
        </div>
    );
};

export default ResponseTimeStats;
