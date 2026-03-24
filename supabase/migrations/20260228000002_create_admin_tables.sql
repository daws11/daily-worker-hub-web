-- Create admin_users table
-- This table tracks admin users and their roles

CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'super_admin', 'support')),
    permissions JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create audit_logs table
-- This table tracks all admin actions for compliance

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID NULL,
    old_values JSONB NULL,
    new_values JSONB NULL,
    ip_address INET NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add verification_status to businesses table
-- Add column to track business verification status

ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS verification_status TEXT 
CHECK (verification_status IN ('pending', 'submitted', 'verified', 'rejected', 'suspended')) 
DEFAULT 'pending';

ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS verification_notes TEXT NULL;

ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS business_type TEXT NULL;

ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS area TEXT NULL;

ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS reliability_score DECIMAL(3,2) NULL;

-- Add additional columns to workers table
-- Add columns to enhance worker management

ALTER TABLE public.workers 
ADD COLUMN IF NOT EXISTS reliability_score DECIMAL(3,2) NULL;

ALTER TABLE public.workers 
ADD COLUMN IF NOT EXISTS total_bookings INTEGER DEFAULT 0 NOT NULL;

ALTER TABLE public.workers 
ADD COLUMN IF NOT EXISTS successful_bookings INTEGER DEFAULT 0 NOT NULL;

ALTER TABLE public.workers 
ADD COLUMN IF NOT EXISTS total_revenue BIGINT DEFAULT 0 NOT NULL;

ALTER TABLE public.workers 
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true NOT NULL;

-- Add additional columns to jobs table
-- Add columns for better job management

ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT false NOT NULL;

ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false NOT NULL;

ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS priority_score INTEGER DEFAULT 0 NOT NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users(role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_user_id ON public.audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_businesses_verification_status ON public.businesses(verification_status);
CREATE INDEX IF NOT EXISTS idx_businesses_business_type ON public.businesses(business_type);
CREATE INDEX IF NOT EXISTS idx_businesses_area ON public.businesses(area);
CREATE INDEX IF NOT EXISTS idx_businesses_reliability_score ON public.businesses(reliability_score);

CREATE INDEX IF NOT EXISTS idx_workers_reliability_score ON public.workers(reliability_score);
CREATE INDEX IF NOT EXISTS idx_workers_is_available ON public.workers(is_available);
CREATE INDEX IF NOT EXISTS idx_workers_stats ON public.workers(total_bookings, successful_bookings, total_revenue);

CREATE INDEX IF NOT EXISTS idx_jobs_urgent ON public.jobs(is_urgent);
CREATE INDEX IF NOT EXISTS idx_jobs_featured ON public.jobs(is_featured);
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON public.jobs(priority_score);

-- Create RLS policies
ALTER POLICY ON public.admin_users USING (true)
    WITH CHECK (
        (auth.uid() IS NOT NULL)
    );

ALTER POLICY ON public.audit_logs USING (true)
    WITH CHECK (
        (auth.uid() IS NOT NULL)
    );

-- Allow admin users to view admin data
CREATE POLICY IF NOT EXISTS "Admins can manage admin_users" 
    ON public.admin_users 
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid()
        )
    );

-- Allow admin users to manage audit logs
CREATE POLICY IF NOT EXISTS "Admins can manage audit_logs" 
    ON public.audit_logs 
    USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid()
        )
    );

-- Trigger to create audit log entry for admin actions
CREATE OR REPLACE FUNCTION audit_admin_action()
RETURNS TRIGGER AS $$
DECLARE
    admin_id UUID;
BEGIN
    -- Get admin user ID
    SELECT id INTO admin_id 
    FROM public.admin_users 
    WHERE user_id = auth.uid();
    
    -- Create audit log entry
    INSERT INTO public.audit_logs (
        admin_user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        ip_address,
        user_agent
    ) VALUES (
        admin_id,
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        OLD,
        NEW,
        inet_client_addr(),
        current_setting('request.headers')::json->>'user-agent'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for admin tables
CREATE TRIGGER admin_users_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.admin_users
FOR EACH ROW
EXECUTE FUNCTION audit_admin_action();

CREATE TRIGGER businesses_audit_trigger
AFTER UPDATE ON public.businesses
FOR EACH ROW
WHEN (
    OLD.verification_status IS DISTINCT FROM NEW.verification_status OR
    OLD.verification_status IS NULL
)
EXECUTE FUNCTION audit_admin_action();

CREATE TRIGGER workers_audit_trigger
AFTER UPDATE ON public.workers
FOR EACH ROW
WHEN (
    OLD.reliability_score IS DISTINCT FROM NEW.reliability_score OR
    OLD.is_available IS DISTINCT FROM NEW.is_available
)
EXECUTE FUNCTION audit_admin_action();

CREATE TRIGGER jobs_audit_trigger
AFTER UPDATE ON public.jobs
FOR EACH ROW
WHEN (
    OLD.status IS DISTINCT FROM NEW.status
)
EXECUTE FUNCTION audit_admin_action();

-- Grant necessary permissions
GRANT ALL ON public.admin_users TO authenticated;
GRANT ALL ON public.audit_logs TO authenticated;
GRANT SELECT ON public.admin_users TO anon;
GRANT SELECT ON public.audit_logs TO anon;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE admin_users.user_id = is_admin.user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;