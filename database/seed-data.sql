-- Seed data for Project Sentinel development
-- This creates dummy users, documents, metrics, and other test data

-- Create dummy user profiles for all roles
INSERT INTO user_profiles (id, email, full_name, role, status, metadata, created_at, updated_at) VALUES
-- SuperAdmin
('11111111-1111-1111-1111-111111111111', 'admin@party.com', 'System Administrator', 'SuperAdmin', 'active', 
 '{"phone": "+1-555-0101", "department": "IT", "security_clearance": "top_secret"}', NOW(), NOW()),

-- PartyHead
('22222222-2222-2222-2222-222222222222', 'leader@party.com', 'Party National Leader', 'PartyHead', 'active',
 '{"phone": "+1-555-0102", "office": "National Headquarters", "term": "2022-2027"}', NOW(), NOW()),

-- RegionalLead (2 regional leaders)
('33333333-3333-3333-3333-333333333333', 'north.lead@party.com', 'Northern Region Lead', 'RegionalLead', 'active',
 '{"phone": "+1-555-0103", "region": "North", "constituencies": 15}', NOW(), NOW()),
('44444444-4444-4444-4444-444444444444', 'south.lead@party.com', 'Southern Region Lead', 'RegionalLead', 'active',
 '{"phone": "+1-555-0104", "region": "South", "constituencies": 12}', NOW(), NOW()),

-- Members (MPs and MLAs)
('55555555-5555-5555-5555-555555555555', 'mp.delhi@party.com', 'Raj Kumar Singh', 'Member', 'active',
 '{"phone": "+1-555-0105", "position": "MP", "constituency": "Delhi Central", "region": "North"}', NOW(), NOW()),
('66666666-6666-6666-6666-666666666666', 'mla.mumbai@party.com', 'Priya Sharma', 'Member', 'active',
 '{"phone": "+1-555-0106", "position": "MLA", "constituency": "Mumbai North", "region": "West"}', NOW(), NOW()),
('77777777-7777-7777-7777-777777777777', 'mp.chennai@party.com', 'Arjun Reddy', 'Member', 'active',
 '{"phone": "+1-555-0107", "position": "MP", "constituency": "Chennai South", "region": "South"}', NOW(), NOW()),

-- Karyakarthas (Grassroots workers)
('88888888-8888-8888-8888-888888888888', 'worker1@party.com', 'Amit Patel', 'Karyakartha', 'active',
 '{"phone": "+1-555-0108", "area": "Sector 15", "supervisor": "33333333-3333-3333-3333-333333333333"}', NOW(), NOW()),
('99999999-9999-9999-9999-999999999999', 'worker2@party.com', 'Sunita Devi', 'Karyakartha', 'active',
 '{"phone": "+1-555-0109", "area": "Block C", "supervisor": "44444444-4444-4444-4444-444444444444"}', NOW(), NOW());

-- Create dummy documents
INSERT INTO documents (id, filename, uploader_id, status, file_size, file_type, metadata, created_at, processed_at) VALUES
('doc-1111-1111-1111-111111111111', 'Party_Manifesto_2024.pdf', '22222222-2222-2222-2222-222222222222', 'processed', 2048576, 'pdf',
 '{"title": "Party Manifesto 2024", "description": "Complete party manifesto and policy framework", "tags": ["manifesto", "policy", "2024"], "security_level": "public", "page_count": 45}', 
 NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),

('doc-2222-2222-2222-222222222222', 'North_Region_Performance_Q1.docx', '33333333-3333-3333-3333-333333333333', 'processed', 1024768, 'docx',
 '{"title": "Northern Region Q1 Performance Report", "description": "Quarterly performance analysis and metrics", "tags": ["performance", "north", "Q1"], "security_level": "internal", "page_count": 23}',
 NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),

('doc-3333-3333-3333-333333333333', 'Media_Strategy_Guidelines.pdf', '22222222-2222-2222-2222-222222222222', 'processed', 512384, 'pdf',
 '{"title": "Media Communication Strategy", "description": "Guidelines for media interactions and public communications", "tags": ["media", "communication", "strategy"], "security_level": "restricted", "page_count": 18}',
 NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),

('doc-4444-4444-4444-444444444444', 'Constituency_Feedback_Mumbai.txt', '66666666-6666-6666-6666-666666666666', 'processed', 256192, 'txt',
 '{"title": "Mumbai North Constituency Feedback", "description": "Citizen feedback and local issues compilation", "tags": ["feedback", "mumbai", "constituency"], "security_level": "internal", "page_count": 8}',
 NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days');

-- Create dummy performance metrics (last 30 days)
DO $$
DECLARE
    member_id UUID;
    date_val DATE;
    day_offset INTEGER;
BEGIN
    -- Array of member IDs
    FOR member_id IN 
        SELECT unnest(ARRAY[
            '55555555-5555-5555-5555-555555555555'::UUID,
            '66666666-6666-6666-6666-666666666666'::UUID,
            '77777777-7777-7777-7777-777777777777'::UUID
        ])
    LOOP
        -- Generate data for last 30 days
        FOR day_offset IN 0..29 LOOP
            date_val := CURRENT_DATE - day_offset;
            
            -- Sentiment Score (varies between -0.5 to 0.8)
            INSERT INTO performance_metrics (member_id, date, metric_name, metric_value, metadata) VALUES
            (member_id, date_val, 'sentiment_score', 
             (RANDOM() * 1.3 - 0.5), 
             '{"source": "social_media_analysis", "confidence": 0.85}');
            
            -- Media Mentions (1-25 per day)
            INSERT INTO performance_metrics (member_id, date, metric_name, metric_value, metadata) VALUES
            (member_id, date_val, 'media_mentions', 
             (RANDOM() * 24 + 1)::INTEGER, 
             '{"positive": ' || (RANDOM() * 15)::INTEGER || ', "negative": ' || (RANDOM() * 8)::INTEGER || ', "neutral": ' || (RANDOM() * 12)::INTEGER || '}');
            
            -- Public Engagement (0.3 to 0.9)
            INSERT INTO performance_metrics (member_id, date, metric_name, metric_value, metadata) VALUES
            (member_id, date_val, 'public_engagement', 
             (RANDOM() * 0.6 + 0.3), 
             '{"events_attended": ' || (RANDOM() * 5)::INTEGER || ', "social_interactions": ' || (RANDOM() * 100 + 50)::INTEGER || '}');
            
            -- Project Completion Rate (0.5 to 1.0)
            INSERT INTO performance_metrics (member_id, date, metric_name, metric_value, metadata) VALUES
            (member_id, date_val, 'project_completion', 
             (RANDOM() * 0.5 + 0.5), 
             '{"total_projects": ' || (RANDOM() * 8 + 3)::INTEGER || ', "completed": ' || (RANDOM() * 6 + 2)::INTEGER || '}');
        END LOOP;
    END LOOP;
END $$;

-- Create dummy alerts
INSERT INTO alerts (id, member_id, severity, title, message, alert_type, status, metadata, created_at) VALUES
('alert-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'high', 
 'Negative Media Coverage Spike', 
 'Unusual increase in negative media mentions detected in the last 24 hours. Sentiment score dropped by 35%. Immediate response recommended.',
 'media_monitoring', 'new',
 '{"affected_region": "Delhi", "media_sources": ["Times of India", "NDTV", "India Today"], "sentiment_drop": 0.35, "mention_count": 47, "trending_keywords": ["policy", "criticism", "response"]}',
 NOW() - INTERVAL '2 hours'),

('alert-2222-2222-2222-222222222222', '66666666-6666-6666-6666-666666666666', 'medium',
 'Social Media Engagement Drop',
 'Social media engagement has decreased by 28% compared to last week average. Consider increasing social media activity.',
 'social_media', 'acknowledged',
 '{"affected_platforms": ["Twitter", "Facebook", "Instagram"], "engagement_drop": 0.28, "period": "last_week", "follower_growth": -12}',
 NOW() - INTERVAL '1 day'),

('alert-3333-3333-3333-333333333333', NULL, 'low',
 'Scheduled Policy Review Meeting',
 'Monthly policy review meeting scheduled for next Tuesday. All regional leads are requested to prepare quarterly reports.',
 'system_notification', 'new',
 '{"meeting_date": "2024-02-15", "participants": ["Policy Team", "Regional Leads"], "agenda_items": ["Healthcare Policy Update", "Education Reforms", "Infrastructure Projects"]}',
 NOW() - INTERVAL '6 hours'),

('alert-4444-4444-4444-444444444444', '77777777-7777-7777-7777-777777777777', 'medium',
 'Constituency Issue Trending',
 'Local infrastructure concerns are gaining traction on social media. Public sentiment shows growing concern about road conditions.',
 'public_sentiment', 'new',
 '{"issue_type": "infrastructure", "sentiment_trend": "declining", "social_mentions": 156, "location": "Chennai South", "urgency": "medium"}',
 NOW() - INTERVAL '4 hours'),

('alert-5555-5555-5555-555555555555', NULL, 'critical',
 'Security Alert - Unusual Login Activity',
 'Multiple failed login attempts detected from unusual IP addresses. Security protocols have been automatically enhanced.',
 'security', 'resolved',
 '{"ip_addresses": ["192.168.1.100", "10.0.0.1"], "failed_attempts": 15, "security_action": "IP_blocked", "resolved_by": "11111111-1111-1111-1111-111111111111"}',
 NOW() - INTERVAL '12 hours');

-- Create dummy audit logs
INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, success, ip_address, user_agent, additional_data, created_at) VALUES
('audit-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'login', 'auth', 'session-001', true, '192.168.1.100', 
 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 
 '{"login_method": "email", "session_duration": 7200, "browser": "Chrome"}', NOW() - INTERVAL '1 hour'),

('audit-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'document_upload', 'document', 'doc-1111-1111-1111-111111111111', true, '192.168.1.101',
 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
 '{"filename": "Party_Manifesto_2024.pdf", "file_size": 2048576, "upload_method": "web_interface", "processing_time": 15000}', 
 NOW() - INTERVAL '30 days'),

('audit-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', 'ai_chat', 'ai_interaction', 'chat-001', true, '192.168.1.102',
 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15',
 '{"query": "Show me the latest sentiment analysis for my constituency", "query_length": 58, "response_length": 342, "model_used": "gpt-4", "processing_time": 1250, "sources_used": 3}',
 NOW() - INTERVAL '2 hours'),

('audit-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'dashboard_view', 'analytics', 'regional-dashboard', true, '192.168.1.103',
 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
 '{"dashboard_type": "regional", "widgets_loaded": 8, "load_time": 1200, "filters_applied": ["region:North", "timeframe:last_month"]}',
 NOW() - INTERVAL '30 minutes'),

('audit-5555-5555-5555-555555555555', '88888888-8888-8888-8888-888888888888', 'data_input', 'local_intelligence', 'report-001', true, '192.168.1.104',
 'Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0 Firefox/88.0',
 '{"report_type": "ground_intelligence", "location": "Sector 15", "data_points": 5, "submission_method": "mobile_app"}',
 NOW() - INTERVAL '45 minutes');

-- Create some sample vector embeddings for document chunks (simplified for demo)
INSERT INTO document_chunks (id, content, embedding, source_document, document_id, uploader_id, chunk_index, metadata) VALUES
('chunk-1111-1111-1111-111111111111', 
 'Our party stands for inclusive development, economic growth, and social justice. We believe in empowering every citizen through education, healthcare, and employment opportunities.',
 ARRAY(SELECT random() FROM generate_series(1, 3072))::vector,
 'Party_Manifesto_2024.pdf', 'doc-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 0,
 '{"section": "introduction", "page": 1, "word_count": 25}'),

('chunk-2222-2222-2222-222222222222',
 'Healthcare accessibility remains a top priority. We propose to establish 500 new primary health centers in rural areas and upgrade existing facilities with modern equipment.',
 ARRAY(SELECT random() FROM generate_series(1, 3072))::vector,
 'Party_Manifesto_2024.pdf', 'doc-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 1,
 '{"section": "healthcare", "page": 12, "word_count": 28}'),

('chunk-3333-3333-3333-333333333333',
 'The Northern region shows strong performance in infrastructure development with 85% project completion rate. However, public engagement metrics suggest need for improved communication.',
 ARRAY(SELECT random() FROM generate_series(1, 3072))::vector,
 'North_Region_Performance_Q1.docx', 'doc-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 0,
 '{"section": "executive_summary", "page": 1, "word_count": 26}');

-- Create chat sessions for demonstration
INSERT INTO chat_sessions (id, user_id, title, message_count, last_activity, metadata) VALUES
('session-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 
 'Constituency Sentiment Analysis', 5, NOW() - INTERVAL '1 hour',
 '{"model": "gpt-4", "total_tokens": 1250, "context_length": 3000}'),

('session-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
 'National Strategy Discussion', 12, NOW() - INTERVAL '30 minutes',
 '{"model": "gpt-4", "total_tokens": 3400, "context_length": 8000}'),

('session-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
 'Regional Performance Review', 8, NOW() - INTERVAL '2 hours',
 '{"model": "gpt-4", "total_tokens": 2100, "context_length": 5000}');

-- Update sequences to prevent conflicts with generated UUIDs
-- (This ensures any new records won't conflict with our test data)

-- Create a summary view for easy data verification
CREATE OR REPLACE VIEW data_summary AS
SELECT 
    'Users' as table_name, 
    COUNT(*)::TEXT as count,
    STRING_AGG(DISTINCT role, ', ') as details
FROM user_profiles
UNION ALL
SELECT 
    'Documents' as table_name,
    COUNT(*)::TEXT as count,
    STRING_AGG(DISTINCT file_type, ', ') as details
FROM documents
UNION ALL
SELECT 
    'Performance Metrics' as table_name,
    COUNT(*)::TEXT as count,
    STRING_AGG(DISTINCT metric_name, ', ') as details
FROM performance_metrics
UNION ALL
SELECT 
    'Alerts' as table_name,
    COUNT(*)::TEXT as count,
    STRING_AGG(DISTINCT severity, ', ') as details
FROM alerts
UNION ALL
SELECT 
    'Audit Logs' as table_name,
    COUNT(*)::TEXT as count,
    STRING_AGG(DISTINCT action, ', ') as details
FROM audit_logs;

-- Display summary
SELECT * FROM data_summary;

-- Display test accounts for easy reference
SELECT 
    role,
    email,
    full_name,
    'testpass123' as password_hint
FROM user_profiles 
ORDER BY 
    CASE role
        WHEN 'SuperAdmin' THEN 1
        WHEN 'PartyHead' THEN 2
        WHEN 'RegionalLead' THEN 3
        WHEN 'Member' THEN 4
        WHEN 'Karyakartha' THEN 5
    END;