# TODO: One-Time Payment & Upgrade System Implementation

## Task: Implement one-time payments with upgrade capability for subscriptions

### ✅ COMPLETED Steps:

1. ✅ **Update Subscription Model** (`src/models/Subscription.js`)
   - ✅ Added PAYMENT_TYPES: 'subscription' (recurring) vs 'one_time' (lifetime)
   - ✅ Added LIFETIME_PRICING for one-time purchases (Premium: $199.99)
   - ✅ Added UPGRADE_PATHS to define valid upgrade paths (free → premium)
   - ✅ Added calculateUpgradeCredit() method
   - ✅ Added getUpgradePricing() method
   - ✅ Updated createSubscription() to support paymentType and billingCycle
   - ✅ Updated updateSubscription() to support paymentType and billingCycle

2. ✅ **Update Subscription Controller** (`src/controllers/SubscriptionController.js`)
   - ✅ Added paymentType and billingCycle support in createSubscription()
   - ✅ Added paymentType and billingCycle support in upgradeSubscription()

3. ✅ **Update Routes** (`src/routes/subscriptions.js`)
   - ✅ GET `/subscriptions/upgrade-pricing` - Get upgrade pricing with credits
   - ✅ POST `/subscriptions/upgrade` - Process upgrade with credit application
   - ✅ Updated GET `/subscriptions/pricing` - Now includes lifetime pricing
   - ✅ Updated POST `/subscriptions/buy` - Now supports one-time purchases

### Implementation Summary:

**Payment Types:**
- `subscription` = recurring (monthly/yearly)
- `one_time` = lifetime purchase

**Lifetime Pricing:**
- Premium Lifetime: $199.99 (one-time)

**Upgrade Logic:**
- FREE can upgrade to PREMIUM
- PREMIUM is top tier (cannot upgrade further)
- Credit calculated from remaining subscription time

### Remaining Database Changes:

The subscriptions table needs new columns. Run migration:
```sql
ALTER TABLE subscriptions 
ADD COLUMN payment_type VARCHAR(20) DEFAULT 'subscription',
ADD COLUMN billing_cycle VARCHAR(20) DEFAULT 'monthly',
ADD COLUMN original_price DECIMAL(10,2) DEFAULT 0;
```

### Testing Endpoints:
- GET /api/subscriptions/pricing - See all pricing options
- GET /api/subscriptions/upgrade-pricing?targetTier=premium - Get upgrade pricing
- POST /api/subscriptions/upgrade - Process upgrade
