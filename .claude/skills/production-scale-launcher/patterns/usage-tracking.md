# Usage Tracking Pattern

## Database Schema
- usage table: user_id, type, count, period_start, period_end
- increment_usage function

## Functions
- trackUsage(userId, type, amount)
- checkLimit(userId, type)
- getUsageSummary(userId)

## Rate Limiting with Upstash
- Sliding window algorithm
- Plan-based limits

## UI Components
- UsageBar
- UsageDashboard
