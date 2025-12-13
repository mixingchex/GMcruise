# Stripe Checkout Pattern

## lib/stripe.ts
import Stripe from stripe
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

## lib/plans.ts
export const PLANS = {
  FREE: { priceId: null, features: [...] },
  PRO: { priceId: process.env.STRIPE_PRO_PRICE_ID, features: [...] },
  ENTERPRISE: { priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID, features: [...] }
}

## API Routes
- POST /api/checkout - Create checkout session
- POST /api/portal - Customer portal session

## Components
- UpgradeButton - Redirect to Stripe Checkout
