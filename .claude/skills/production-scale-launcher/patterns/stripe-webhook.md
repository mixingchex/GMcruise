# Stripe Webhook Pattern

## Required Events
- checkout.session.completed
- invoice.payment_succeeded
- invoice.payment_failed
- customer.subscription.updated
- customer.subscription.deleted

## API Route: /api/webhooks/stripe
1. Verify webhook signature
2. Handle event type
3. Update database
4. Return 200 OK

## Testing
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed
