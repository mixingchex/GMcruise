# Auth Middleware Pattern

## Plan-based Features
- PLANS constant with features and limits
- hasFeatureAccess(feature) function
- canAccessRoute(userPlan, requiredPlans)

## Next.js Middleware
- Route protection by plan
- Redirect to pricing page if insufficient plan

## Components
- FeatureGate (server and client)
- UpgradePrompt
