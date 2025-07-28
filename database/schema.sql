-- =====================================================
-- PROJECT SENTINEL - SECURE DATABASE SCHEMA
-- Enterprise-grade security with RLS policies
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- =====================================================
-- SECURITY ENUMS AND TYPES
-- =====================================================

CREATE TYPE user_role AS ENUM ('admin', 'analyst', 'operator', 'viewer');
CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved', 'escalated');
CREATE TYPE alert_severity AS ENUM ('critical', 'high', 'medium', 'low', 'info');
CREATE TYPE audit_action AS ENUM ('create', 'read', 'update', 'delete', 'login', 'logout', 'failed_login', 'permission_denied', 'file_upload', 'file_download', 'data_export');
CREATE TYPE document_status AS ENUM ('uploading', 'processing', 'processed', 'failed', 'quarantined');
CREATE TYPE job_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

-- =====================================================
-- CORE TABLES WITH SECURITY CONTROLS
-- =====================================================

-- Users table with enhanced security
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email CITEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'viewer',
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    mfa_secret TEXT,
    last_login TIMESTAMPTZ,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    -- Security constraints
    CONSTRAINT users_email_valid CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_password_hash_length CHECK (length(password_hash) >= 60),
    CONSTRAINT users_name_not_empty CHECK (length(trim(first_name)) > 0 AND length(trim(last_name)) > 0)
);

-- User sessions for secure session management
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    refresh_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    refresh_expires_at TIMESTAMPTZ NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Security constraints
    CONSTRAINT session_tokens_not_empty CHECK (length(session_token) > 0 AND length(refresh_token) > 0)
);

-- Documents table with security metadata
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    status document_status NOT NULL DEFAULT 'uploading',
    scan_results JSONB,
    processing_metadata JSONB,
    is_encrypted BOOLEAN NOT NULL DEFAULT true,
    encryption_key_id TEXT,
    access_level user_role NOT NULL DEFAULT 'viewer',
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    
    -- Security constraints
    CONSTRAINT documents_file_size_positive CHECK (file_size > 0),
    CONSTRAINT documents_filename_not_empty CHECK (length(trim(filename)) > 0),
    CONSTRAINT documents_file_hash_not_empty CHECK (length(file_hash) > 0)
);

-- Alerts table for security monitoring
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity alert_severity NOT NULL,
    status alert_status NOT NULL DEFAULT 'active',
    category TEXT NOT NULL,
    source_system TEXT,
    affected_resource TEXT,
    metadata JSONB,
    assigned_to UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    escalated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Security constraints
    CONSTRAINT alerts_title_not_empty CHECK (length(trim(title)) > 0),
    CONSTRAINT alerts_description_not_empty CHECK (length(trim(description)) > 0)
);

-- Performance metrics for system monitoring
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_unit TEXT,
    dimensions JSONB,
    collected_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Security constraints
    CONSTRAINT metrics_name_not_empty CHECK (length(trim(metric_name)) > 0)
);

-- Comprehensive audit logging
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    session_id UUID REFERENCES user_sessions(id),
    action audit_action NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    request_id TEXT,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    additional_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Performance index
    INDEX idx_audit_logs_user_created (user_id, created_at),
    INDEX idx_audit_logs_action_created (action, created_at),
    INDEX idx_audit_logs_resource (resource_type, resource_id)
);

-- Background jobs table
CREATE TABLE background_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_type TEXT NOT NULL,
    status job_status NOT NULL DEFAULT 'pending',
    payload JSONB NOT NULL,
    result JSONB,
    error_message TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_background_jobs_status_scheduled (status, scheduled_at),
    INDEX idx_background_jobs_type (job_type)
);

-- API rate limits tracking
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier TEXT NOT NULL, -- IP address or user ID
    endpoint TEXT NOT NULL,
    requests_count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(identifier, endpoint, window_start)
);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read their own data" ON users
    FOR SELECT USING (auth.uid() = id OR auth.jwt() ->> 'role' IN ('admin'));

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND 
        role = OLD.role AND -- Prevent role escalation
        is_active = OLD.is_active -- Prevent self-deactivation
    );

CREATE POLICY "Only admins can manage users" ON users
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- User sessions policies
CREATE POLICY "Users can manage their own sessions" ON user_sessions
    FOR ALL USING (user_id = auth.uid());

-- Documents policies  
CREATE POLICY "Users can read documents based on access level" ON documents
    FOR SELECT USING (
        user_id = auth.uid() OR
        (auth.jwt() ->> 'role')::user_role >= access_level
    );

CREATE POLICY "Users can manage their own documents" ON documents
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own documents" ON documents
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Only admins can delete documents" ON documents
    FOR DELETE USING (auth.jwt() ->> 'role' = 'admin');

-- Alerts policies
CREATE POLICY "Users can read alerts based on role" ON alerts
    FOR SELECT USING (
        auth.jwt() ->> 'role' IN ('admin', 'analyst', 'operator') OR
        assigned_to = auth.uid()
    );

CREATE POLICY "Analysts and above can manage alerts" ON alerts
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'analyst', 'operator'));

-- Performance metrics policies
CREATE POLICY "Operators and above can read metrics" ON performance_metrics
    FOR SELECT USING (auth.jwt() ->> 'role' IN ('admin', 'analyst', 'operator'));

-- Audit logs policies (read-only for security)
CREATE POLICY "Admins can read audit logs" ON audit_logs
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- Background jobs policies
CREATE POLICY "System can manage background jobs" ON background_jobs
    FOR ALL USING (true); -- Service role access only

-- Rate limits policies
CREATE POLICY "System can manage rate limits" ON rate_limits
    FOR ALL USING (true); -- Service role access only

-- =====================================================
-- SECURITY FUNCTIONS
-- =====================================================

-- Function to hash passwords securely
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf', 12));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify passwords
CREATE OR REPLACE FUNCTION verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN crypt(password, hash) = hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id UUID,
    p_session_id UUID,
    p_action audit_action,
    p_resource_type TEXT DEFAULT NULL,
    p_resource_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT true,
    p_error_message TEXT DEFAULT NULL,
    p_additional_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id, session_id, action, resource_type, resource_id,
        old_values, new_values, ip_address, user_agent, success,
        error_message, additional_data
    ) VALUES (
        p_user_id, p_session_id, p_action, p_resource_type, p_resource_id,
        p_old_values, p_new_values, p_ip_address, p_user_agent, p_success,
        p_error_message, p_additional_data
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() OR refresh_expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to unlock users after lockout period
CREATE OR REPLACE FUNCTION unlock_expired_lockouts()
RETURNS INTEGER AS $$
DECLARE
    unlocked_count INTEGER;
BEGIN
    UPDATE users 
    SET login_attempts = 0, locked_until = NULL
    WHERE locked_until IS NOT NULL AND locked_until < NOW();
    
    GET DIAGNOSTICS unlocked_count = ROW_COUNT;
    RETURN unlocked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS FOR AUTOMATED SECURITY
-- =====================================================

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at 
    BEFORE UPDATE ON alerts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INDEXES FOR PERFORMANCE AND SECURITY
-- =====================================================

-- Performance indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_active ON users(role, is_active);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_tokens ON user_sessions(session_token, refresh_token);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_alerts_status_severity ON alerts(status, severity);
CREATE INDEX idx_alerts_created_at ON alerts(created_at);
CREATE INDEX idx_performance_metrics_name_collected ON performance_metrics(metric_name, collected_at);

-- Security indexes for audit logging
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_user_action ON audit_logs(user_id, action);

-- =====================================================
-- INITIAL ADMIN USER SETUP
-- =====================================================

-- Create initial admin user (password should be changed immediately)
INSERT INTO users (
    email, 
    password_hash, 
    role, 
    first_name, 
    last_name, 
    is_active, 
    is_verified
) VALUES (
    'admin@sentinel.ai',
    hash_password('SecureAdmin2024!'),
    'admin',
    'System',
    'Administrator',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- CLEANUP PROCEDURES (run periodically)
-- =====================================================

-- Schedule cleanup of expired sessions (run every hour)
-- Schedule cleanup of old audit logs based on retention policy
-- Schedule cleanup of expired rate limit entries
-- Schedule unlock of expired user lockouts