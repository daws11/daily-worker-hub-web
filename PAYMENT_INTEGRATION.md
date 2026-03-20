# Payment Integration

This document explains the payment integration system for Daily Worker Hub, supporting Xendit and Midtrans payment gateways.

## Overview

The payment system provides a unified interface for processing payments through multiple payment gateways:

- **Xendit**: QRIS payments, bank transfers, e-wallets
- **Midtrans**: Bank transfers (VA), e-wallets (GoPay, ShopeePay), credit cards

## Architecture

```
lib/payments/
├── gateway.ts        # Unified payment gateway interface
├── xendit.ts        # Xendit implementation
├── midtrans.ts      # Midtrans implementation
└── index.ts         # Exports and factory

app/api/
├── payments/
│   ├── create/      # Payment creation API
│   └── verify/      # Payment verification API
└── webhooks/
    ├── xendit/      # Xendit webhook handler
    └── midtrans/    # Midtrans webhook handler

components/payment/
├── payment-modal.tsx       # Payment selection modal
└── payment-status.tsx      # Payment status display
```

## Environment Variables

### Required Environment Variables

Create a `.env.local` file and add the following:

#### Xendit Configuration

```bash
# Xendit API credentials
XENDIT_SECRET_KEY=your_xendit_secret_key_here
XENDIT_WEBHOOK_TOKEN=your_xendit_webhook_token_here

# Optional: Override Xendit API URLs (defaults to production)
XENDIT_API_URL=https://api.xendit.co
```

#### Midtrans Configuration

```bash
# Midtrans API credentials
MIDTRANS_SERVER_KEY=your_midtrans_server_key_here
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=your_midtrans_client_key_here

# Environment mode
MIDTRANS_IS_PRODUCTION=false

# Optional: Override Midtrans API URLs
MIDTRANS_API_URL=https://api.midtrans.com/v2
MIDTRANS_SNAP_API_URL=https://app.midtrans.com/snap/v1
```

### How to Get API Keys

#### Xendit

1. Go to [Xendit Dashboard](https://dashboard.xendit.co/settings/developers#api-keys)
2. Create API keys for production and/or development
3. Copy the secret key
4. Set up webhook token: Go to Settings > Webhooks > Create new webhook
5. Set webhook URL to: `https://yourdomain.com/api/webhooks/xendit`
6. Copy the webhook token

#### Midtrans

1. Go to [Midtrans Dashboard](https://dashboard.midtrans.com/)
2. Go to Settings > Access Keys
3. Copy Server Key (backend) and Client Key (frontend)
4. Set environment mode:
   - Development: Use sandbox keys, set `MIDTRANS_IS_PRODUCTION=false`
   - Production: Use production keys, set `MIDTRANS_IS_PRODUCTION=true`
5. Configure webhook URL: `https://yourdomain.com/api/webhooks/midtrans`

## Usage

### Creating a Payment

#### Using Server Actions

```typescript
import { initializeQrisPayment } from "@/lib/actions/payments";

const result = await initializeQrisPayment(
  businessId, // Business ID
  500000, // Amount in IDR
  metadata, // Optional metadata
  "xendit", // Provider: 'xendit' | 'midtrans'
);

if (result.success) {
  console.log("Payment URL:", result.data.payment_url);
  console.log("Transaction ID:", result.data.transaction.id);
}
```

#### Using API Directly

```typescript
const response = await fetch("/api/payments/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    business_id: "business_123",
    amount: 500000,
    provider: "xendit",
    payment_method: "qris",
    customer_email: "user@example.com",
    customer_name: "Business Name",
  }),
});

const data = await response.json();
```

### Using Payment Modal Component

```tsx
import { PaymentModal } from "@/components/payment/payment-modal";

function BusinessWallet() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)}>Top Up Wallet</Button>

      <PaymentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        businessId={businessId}
        onSuccess={(transactionId) => {
          console.log("Payment created:", transactionId);
        }}
      />
    </>
  );
}
```

### Checking Payment Status

#### Using API

```typescript
const response = await fetch(
  `/api/payments/verify?transaction_id=${transactionId}&provider=xendit`,
);
const data = await response.json();

console.log("Payment status:", data.data.status);
```

#### Using Payment Status Component

```tsx
import { PaymentStatus } from "@/components/payment/payment-status";

<PaymentStatus
  transaction={paymentTransaction}
  onRefresh={() => refetch()}
  isRefreshing={isLoading}
/>;
```

## Payment Methods

### Xendit

- **QRIS**: 0.7% + Rp 500
- **Bank Transfer**: 0.5% + Rp 4,000
- **E-Wallet**: 1.5%

### Midtrans

- **Bank Transfer (VA)**: Rp 4,000 flat
- **Credit Card**: 2.9% + Rp 2,000
- **QRIS**: 0.7% + Rp 500
- **GoPay**: 1.5%
- **ShopeePay**: 1.5%

## Payment Status Flow

```
pending → success (payment completed)
  ↓
failed / expired / cancelled
```

### Status Descriptions

- `pending`: Payment waiting for user action
- `success`: Payment completed successfully
- `failed`: Payment processing failed
- `expired`: Payment window expired
- `cancelled`: Payment was cancelled

## Webhook Handling

Both Xendit and Midtrans webhooks are handled automatically:

1. Webhook receives payment notification
2. Signature is verified for security
3. Payment transaction is updated in database
4. If successful, wallet is credited
5. Transaction history is recorded

**Important**: Keep your webhook URLs secure and verify signatures in production.

## Database Tables

### payment_transactions

```sql
CREATE TABLE payment_transactions (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  status TEXT NOT NULL,
  payment_provider TEXT NOT NULL,
  provider_payment_id TEXT,
  payment_url TEXT,
  qris_expires_at TIMESTAMP,
  paid_at TIMESTAMP,
  failure_reason TEXT,
  fee_amount DECIMAL NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### wallets

```sql
CREATE TABLE wallets (
  id TEXT PRIMARY KEY,
  business_id TEXT,
  worker_id TEXT,
  balance DECIMAL DEFAULT 0,
  currency TEXT DEFAULT 'IDR',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### wallet_transactions

```sql
CREATE TABLE wallet_transactions (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  reference_id TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Error Handling

### Common Errors

1. **Invalid Amount**
   - Error: `Minimum top-up amount is Rp 500,000`
   - Solution: Ensure amount meets minimum requirement

2. **Provider Not Enabled**
   - Error: `Payment provider 'xendit' is not enabled`
   - Solution: Configure environment variables for the provider

3. **Transaction Not Found**
   - Error: `Transaction not found`
   - Solution: Verify transaction ID is correct

4. **Invalid Signature**
   - Error: `Invalid callback token` or `Invalid signature`
   - Solution: Verify webhook tokens/keys are correct

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use different keys** for development and production
3. **Enable webhook verification** to prevent fraud
4. **Monitor transactions** for suspicious activity
5. **Set appropriate limits** for payment amounts
6. **Validate user input** before creating payments

## Testing

### Test Payments

#### Xendit (Sandbox)

- Use Xendit test credentials
- Test payments will appear in Xendit dashboard
- Webhooks can be tested using Xendit's webhook simulator

#### Midtrans (Sandbox)

- Use Midtrans test credentials
- Test card numbers: 4111 1111 1111 1111 (success), 4000 0000 0000 0002 (failure)
- More test scenarios: [Midtrans Test Cards](https://docs.midtrans.com/en/test-credit-card)

## Support

- **Xendit Documentation**: https://developers.xendit.co/
- **Midtrans Documentation**: https://docs.midtrans.com/
- **Project Issues**: https://github.com/daws11/daily-worker-hub/issues

## Troubleshooting

### Payment Status Stuck on "Pending"

- Check if webhook URL is accessible
- Verify webhook token/key is correct
- Check payment gateway dashboard for transaction details
- Manually verify payment: `GET /api/payments/verify`

### Webhook Not Receiving

- Ensure webhook URL is publicly accessible
- Check firewall/security settings
- Verify webhook configuration in payment gateway dashboard

### Wallet Not Credited

- Check payment status in database
- Review webhook logs for errors
- Verify wallet exists for the business
- Check for duplicate transactions

## Future Enhancements

- [ ] Add more payment providers (Stripe, PayPal)
- [ ] Support recurring payments
- [ ] Add payout API for worker withdrawals
- [ ] Payment reconciliation system
- [ ] Advanced fraud detection
- [ ] Multi-currency support
- [ ] Payment analytics dashboard
