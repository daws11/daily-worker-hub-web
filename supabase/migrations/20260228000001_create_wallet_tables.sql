-- Create wallet_transactions table
-- This table tracks all wallet internal transactions

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    booking_id UUID NULL REFERENCES public.bookings(id) ON DELETE SET NULL,
    amount BIGINT NOT NULL CHECK (amount >= 0),
    type TEXT NOT NULL CHECK (type IN ('hold', 'release', 'earn', 'payout', 'refund')),
    status TEXT NOT NULL CHECK (status IN ('pending_review', 'available', 'released', 'disputed', 'cancelled')),
    description TEXT NULL,
    metadata JSONB NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create payment_transactions table
-- This table tracks all external payment provider transactions (QRIS, Xendit, etc.)

CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL CHECK (amount >= 0),
    fee_amount BIGINT NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'pending', 'released')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'expired')),
    payment_provider TEXT NOT NULL,
    provider_payment_id TEXT NULL,
    payment_url TEXT NULL,
    qris_expires_at TIMESTAMPTZ NULL,
    paid_at TIMESTAMPTZ NULL,
    failure_reason TEXT NULL,
    metadata JSONB NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create wallets table
-- This table tracks user wallet balances

CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    business_id UUID NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    worker_id UUID NULL REFERENCES public.workers(id) ON DELETE CASCADE,
    balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
    pending_balance BIGINT NOT NULL DEFAULT 0 CHECK (pending_balance >= 0),
    available_balance BIGINT NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
    currency TEXT NOT NULL DEFAULT 'IDR',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT wallets_user_business_worker_check CHECK (
        (user_id IS NOT NULL) AND (
            (business_id IS NOT NULL AND worker_id IS NULL) OR
            (worker_id IS NOT NULL AND business_id IS NULL) OR
            (business_id IS NULL AND worker_id IS NULL)
        )
    )
);

-- Create disputes table
-- This table tracks disputes between users

CREATE TABLE IF NOT EXISTS public.disputes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    raised_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    evidence_urls TEXT[] NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
    resolution TEXT NULL,
    resolved_at TIMESTAMPTZ NULL,
    resolved_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add payment_status to bookings table
-- Add column to track payment status for bookings

ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_status TEXT 
CHECK (payment_status IN ('pending', 'paid', 'disputed', 'refunded', 'failed')) 
DEFAULT 'pending';

-- Update existing bookings to have payment_status
UPDATE public.bookings 
SET payment_status = CASE 
    WHEN status = 'completed' THEN 'paid'
    WHEN status = 'cancelled' THEN 'refunded'
    ELSE 'pending'
END
WHERE payment_status IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_booking_id ON public.wallet_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON public.wallet_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_business_id ON public.payment_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON public.payment_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_disputes_booking_id ON public.disputes(booking_id);
CREATE INDEX IF NOT EXISTS idx_disputes_raised_by ON public.disputes(raised_by);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON public.disputes(created_at);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_business_id ON public.wallets(business_id);
CREATE INDEX IF NOT EXISTS idx_wallets_worker_id ON public.wallets(worker_id);

-- Create RLS policies
ALTER POLICY ON public.wallet_transactions USING (true)
    WITH CHECK (
        (auth.uid() IS NOT NULL)
    );

ALTER POLICY ON public.payment_transactions USING (true)
    WITH CHECK (
        (auth.uid() IS NOT NULL)
    );

ALTER POLICY ON public.wallets USING (true)
    WITH CHECK (
        (auth.uid() IS NOT NULL)
    );

ALTER POLICY ON public.disputes USING (true)
    WITH CHECK (
        (auth.uid() IS NOT NULL)
    );

-- Allow users to view their own transactions
CREATE POLICY IF NOT EXISTS "Users can view own wallet_transactions" 
    ON public.wallet_transactions 
    FOR SELECT 
    USING (
        auth.uid() = (SELECT user_id FROM public.wallets WHERE id = wallet_transactions.wallet_id)
    );

-- Allow businesses to view their own payment transactions
CREATE POLICY IF NOT EXISTS "Businesses can view own payment_transactions" 
    ON public.payment_transactions 
    FOR SELECT 
    USING (
        auth.uid() = payment_transactions.business_id
    );

-- Allow users to view their own wallets
CREATE POLICY IF NOT EXISTS "Users can view own wallets" 
    ON public.wallets 
    FOR SELECT 
    USING (
        auth.uid() = wallets.user_id OR
        auth.uid() IN (SELECT user_id FROM public.businesses WHERE id = wallets.business_id) OR
        auth.uid() IN (SELECT user_id FROM public.workers WHERE id = wallets.worker_id)
    );

-- Allow users to view their own disputes
CREATE POLICY IF NOT EXISTS "Users can view own disputes" 
    ON public.disputes 
    FOR SELECT 
    USING (
        auth.uid() = disputes.raised_by OR
        auth.uid() IN (
            SELECT business_id FROM public.bookings WHERE id = disputes.booking_id
            UNION
            SELECT worker_id FROM public.bookings WHERE id = disputes.booking_id
        )
    );

-- Grant necessary permissions
GRANT ALL ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO authenticated;
GRANT ALL ON public.wallets TO authenticated;
GRANT ALL ON public.disputes TO authenticated;

GRANT SELECT ON public.wallet_transactions TO anon;
GRANT SELECT ON public.payment_transactions TO anon;
GRANT SELECT ON public.wallets TO anon;
GRANT SELECT ON public.disputes TO anon;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_wallet_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wallet_transactions_updated_at
BEFORE UPDATE ON public.wallet_transactions
FOR EACH ROW
EXECUTE FUNCTION update_wallet_transactions_updated_at();

CREATE OR REPLACE FUNCTION update_payment_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_transactions_updated_at
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW
EXECUTE FUNCTION update_payment_transactions_updated_at();

CREATE OR REPLACE FUNCTION update_disputes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER disputes_updated_at
BEFORE UPDATE ON public.disputes
FOR EACH ROW
EXECUTE FUNCTION update_disputes_updated_at();

CREATE OR REPLACE FUNCTION update_wallets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wallets_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW
EXECUTE FUNCTION update_wallets_updated_at();