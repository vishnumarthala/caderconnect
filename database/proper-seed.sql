-- Proper seed data for Project Sentinel that matches the actual schema
-- This creates test users that can be used for both development and production authentication

-- Insert test users with hashed passwords
INSERT INTO users (
    id, 
    email, 
    password_hash, 
    role, 
    first_name, 
    last_name, 
    is_active, 
    is_verified,
    created_at,
    updated_at
) VALUES
-- SuperAdmin
('11111111-1111-1111-1111-111111111111', 
 'admin@party.com', 
 hash_password('TestPassword123!'), 
 'admin', 
 'System', 
 'Administrator', 
 true, 
 true,
 NOW(),
 NOW()),

-- National Leader (analyst role for party head)
('22222222-2222-2222-2222-222222222222', 
 'leader@party.com', 
 hash_password('TestPassword123!'), 
 'analyst', 
 'Party National', 
 'Leader', 
 true, 
 true,
 NOW(),
 NOW()),

-- Regional Leaders (operator role)
('33333333-3333-3333-3333-333333333333', 
 'north.lead@party.com', 
 hash_password('TestPassword123!'), 
 'operator', 
 'Northern Region', 
 'Lead', 
 true, 
 true,
 NOW(),
 NOW()),

('44444444-4444-4444-4444-444444444444', 
 'south.lead@party.com', 
 hash_password('TestPassword123!'), 
 'operator', 
 'Southern Region', 
 'Lead', 
 true, 
 true,
 NOW(),
 NOW()),

-- Members (viewer role)
('55555555-5555-5555-5555-555555555555', 
 'mp.delhi@party.com', 
 hash_password('TestPassword123!'), 
 'viewer', 
 'Raj Kumar', 
 'Singh', 
 true, 
 true,
 NOW(),
 NOW()),

('66666666-6666-6666-6666-666666666666', 
 'mla.mumbai@party.com', 
 hash_password('TestPassword123!'), 
 'viewer', 
 'Priya', 
 'Sharma', 
 true, 
 true,
 NOW(),
 NOW()),

('77777777-7777-7777-7777-777777777777', 
 'mp.chennai@party.com', 
 hash_password('TestPassword123!'), 
 'viewer', 
 'Arjun', 
 'Reddy', 
 true, 
 true,
 NOW(),
 NOW()),

-- Karyakarthas (viewer role)
('88888888-8888-8888-8888-888888888888', 
 'worker1@party.com', 
 hash_password('TestPassword123!'), 
 'viewer', 
 'Amit', 
 'Patel', 
 true, 
 true,
 NOW(),
 NOW()),

('99999999-9999-9999-9999-999999999999', 
 'worker2@party.com', 
 hash_password('TestPassword123!'), 
 'viewer', 
 'Sunita', 
 'Devi', 
 true, 
 true,
 NOW(),
 NOW())

ON CONFLICT (email) DO NOTHING;

-- Create some test alerts
INSERT INTO alerts (
    id,
    title,
    description,
    severity,
    status,
    category,
    created_by,
    created_at,
    updated_at
) VALUES
('alert-1111-1111-1111-111111111111',
 'High Media Activity Detected',
 'Unusual spike in media mentions detected for Delhi constituency. Requires immediate attention.',
 'high',
 'active',
 'media_monitoring',
 '11111111-1111-1111-1111-111111111111',
 NOW() - INTERVAL '2 hours',
 NOW() - INTERVAL '2 hours'),

('alert-2222-2222-2222-222222222222',
 'Policy Review Meeting',
 'Monthly policy review meeting scheduled for next week. All regional leads required to attend.',
 'medium',
 'active',
 'scheduling',
 '22222222-2222-2222-2222-222222222222',
 NOW() - INTERVAL '1 day',
 NOW() - INTERVAL '1 day'),

('alert-3333-3333-3333-333333333333',
 'System Maintenance',
 'Scheduled system maintenance will occur this weekend. Platform will be unavailable for 2 hours.',
 'low',
 'active',
 'system',
 '11111111-1111-1111-1111-111111111111',
 NOW() - INTERVAL '6 hours',
 NOW() - INTERVAL '6 hours')

ON CONFLICT (id) DO NOTHING;

-- Create some test documents
INSERT INTO documents (
    id,
    user_id,
    filename,
    original_filename,
    file_path,
    file_size,
    mime_type,
    file_hash,
    status,
    access_level,
    created_at,
    updated_at
) VALUES
('doc-1111-1111-1111-111111111111',
 '22222222-2222-2222-2222-222222222222',
 'party_manifesto_2024.pdf',
 'Party Manifesto 2024.pdf',
 '/uploads/documents/party_manifesto_2024.pdf',
 2048576,
 'application/pdf',
 'abc123def456ghi789',
 'processed',
 'viewer',
 NOW() - INTERVAL '30 days',
 NOW() - INTERVAL '30 days'),

('doc-2222-2222-2222-222222222222',
 '33333333-3333-3333-3333-333333333333',
 'regional_report_q1.docx',
 'Regional Report Q1.docx',
 '/uploads/documents/regional_report_q1.docx',
 1024768,
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 'def456ghi789jkl012',
 'processed',
 'operator',
 NOW() - INTERVAL '15 days',
 NOW() - INTERVAL '15 days')

ON CONFLICT (id) DO NOTHING;

-- Create performance metrics
INSERT INTO performance_metrics (
    id,
    metric_name,
    metric_value,
    metric_unit,
    dimensions,
    collected_at,
    created_at
) VALUES
('metric-1111-1111-1111-111111111111',
 'active_users',
 150,
 'count',
 '{"timeframe": "daily", "region": "all"}',
 NOW() - INTERVAL '1 hour',
 NOW() - INTERVAL '1 hour'),

('metric-2222-2222-2222-222222222222',
 'document_uploads',
 25,
 'count',
 '{"timeframe": "daily", "region": "north"}',
 NOW() - INTERVAL '1 hour',
 NOW() - INTERVAL '1 hour'),

('metric-3333-3333-3333-333333333333',
 'ai_queries',
 89,
 'count',
 '{"timeframe": "daily", "model": "gpt-4"}',
 NOW() - INTERVAL '1 hour',
 NOW() - INTERVAL '1 hour')

ON CONFLICT (id) DO NOTHING;

-- Display created test accounts for reference
SELECT 
    email,
    first_name || ' ' || last_name as full_name,
    role,
    is_active,
    'TestPassword123!' as test_password
FROM users 
WHERE email LIKE '%@party.com'
ORDER BY 
    CASE role
        WHEN 'admin' THEN 1
        WHEN 'analyst' THEN 2
        WHEN 'operator' THEN 3
        WHEN 'viewer' THEN 4
    END;