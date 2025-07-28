#!/usr/bin/env node
/**
 * Database seeding script for Project Sentinel
 * Creates sample data for development and testing
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Seed sample documents
    console.log('📄 Seeding sample documents...');
    const { data: documents, error: docError } = await supabase
      .from('documents')
      .insert([
        {
          filename: 'party-manifesto-2024.pdf',
          uploader_id: null, // Will be set to actual admin user
          status: 'processed',
          file_size: 2048576,
          file_type: 'pdf',
          metadata: {
            title: 'Party Manifesto 2024',
            description: 'Official party manifesto and policy document',
            tags: ['manifesto', 'policy', '2024'],
            security_level: 'internal'
          }
        },
        {
          filename: 'constituency-report-north.docx',
          uploader_id: null,
          status: 'processed',
          file_size: 1024768,
          file_type: 'docx',
          metadata: {
            title: 'North Constituency Report',
            description: 'Quarterly performance and feedback report',
            tags: ['constituency', 'report', 'north'],
            security_level: 'restricted'
          }
        },
        {
          filename: 'media-guidelines.pdf',
          uploader_id: null,
          status: 'processed',
          file_size: 512384,
          file_type: 'pdf',
          metadata: {
            title: 'Media Communication Guidelines',
            description: 'Guidelines for media interactions and communications',
            tags: ['media', 'guidelines', 'communication'],
            security_level: 'internal'
          }
        }
      ])
      .select();

    if (docError) {
      console.error('❌ Error seeding documents:', docError);
      return;
    }

    // Seed sample alerts
    console.log('🚨 Seeding sample alerts...');
    const { error: alertError } = await supabase
      .from('alerts')
      .insert([
        {
          member_id: null, // Will be set to actual user
          severity: 'high',
          title: 'Negative Media Coverage Spike',
          message: 'Unusual increase in negative media mentions detected in the last 24 hours. Requires immediate attention.',
          alert_type: 'media_monitoring',
          status: 'new',
          metadata: {
            affected_region: 'National',
            media_sources: ['News Channel A', 'Newspaper B', 'Online Portal C'],
            sentiment_score: -0.65,
            mention_count: 47
          }
        },
        {
          member_id: null,
          severity: 'medium',
          title: 'Social Media Engagement Drop',
          message: 'Social media engagement has decreased by 25% compared to last week average.',
          alert_type: 'social_media',
          status: 'new',
          metadata: {
            affected_platforms: ['Twitter', 'Facebook', 'Instagram'],
            engagement_drop: 0.25,
            period: 'last_week'
          }
        },
        {
          member_id: null,
          severity: 'low',
          title: 'Scheduled Policy Review',
          message: 'Monthly policy review meeting scheduled for next week. Please prepare relevant materials.',
          alert_type: 'system_notification',
          status: 'acknowledged',
          metadata: {
            meeting_date: '2024-08-05',
            participants: ['Policy Team', 'Strategic Planning'],
            agenda_items: ['Healthcare Policy Update', 'Education Reforms']
          }
        }
      ]);

    if (alertError) {
      console.error('❌ Error seeding alerts:', alertError);
      return;
    }

    // Seed sample performance metrics
    console.log('📊 Seeding sample performance metrics...');
    const metricsData = [];
    const members = ['member-001', 'member-002', 'member-003'];
    const metrics = ['sentiment_score', 'media_mentions', 'public_engagement', 'project_completion'];
    
    // Generate metrics for the last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      members.forEach(memberId => {
        metrics.forEach(metric => {
          let value;
          switch (metric) {
            case 'sentiment_score':
              value = Math.random() * 1.0 - 0.5; // -0.5 to 0.5
              break;
            case 'media_mentions':
              value = Math.floor(Math.random() * 20) + 1; // 1-20
              break;
            case 'public_engagement':
              value = Math.random() * 1.0; // 0-1
              break;
            case 'project_completion':
              value = Math.random() * 1.0; // 0-1
              break;
          }
          
          metricsData.push({
            member_id: memberId,
            date: date.toISOString().split('T')[0],
            metric_name: metric,
            metric_value: value,
            metadata: {
              source: 'automated_tracking',
              confidence: Math.random() * 0.3 + 0.7 // 0.7-1.0
            }
          });
        });
      });
    }

    const { error: metricsError } = await supabase
      .from('performance_metrics')
      .insert(metricsData);

    if (metricsError) {
      console.error('❌ Error seeding performance metrics:', metricsError);
      return;
    }

    // Seed sample audit logs
    console.log('📝 Seeding sample audit logs...');
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert([
        {
          user_id: null, // Will be set to actual user
          action: 'login',
          resource_type: 'auth',
          resource_id: 'session-001',
          success: true,
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          additional_data: {
            login_method: 'email',
            session_duration: 3600
          }
        },
        {
          user_id: null,
          action: 'document_upload',
          resource_type: 'document',
          resource_id: documents[0].id,
          success: true,
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          additional_data: {
            filename: 'party-manifesto-2024.pdf',
            file_size: 2048576,
            upload_method: 'web_interface'
          }
        },
        {
          user_id: null,
          action: 'ai_chat',
          resource_type: 'ai_interaction',
          resource_id: 'chat-001',
          success: true,
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          additional_data: {
            query_length: 85,
            response_length: 342,
            model_used: 'gpt-4',
            processing_time: 1250
          }
        }
      ]);

    if (auditError) {
      console.error('❌ Error seeding audit logs:', auditError);
      return;
    }

    console.log('✅ Database seeding completed successfully!');
    console.log('');
    console.log('📄 Sample documents: 3 items');
    console.log('🚨 Sample alerts: 3 items');
    console.log('📊 Performance metrics: ' + metricsData.length + ' items');
    console.log('📝 Audit logs: 3 items');
    console.log('');
    console.log('🎉 Your development database is now ready with sample data!');

  } catch (error) {
    console.error('❌ Error during database seeding:', error.message);
    process.exit(1);
  }
}

// Check if required environment variables are set
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Please check your .env.local file and try again.');
  process.exit(1);
}

// Run the seeding
seedDatabase();