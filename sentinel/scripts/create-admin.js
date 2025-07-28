#!/usr/bin/env node
/**
 * Script to create the first SuperAdmin user for Project Sentinel
 * Usage: npm run create-admin -- --email admin@example.com --password secure123 --name "Admin User"
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { Command } = require('commander');

require('dotenv').config({ path: '.env.local' });

const program = new Command();

program
  .requiredOption('-e, --email <email>', 'Admin email address')
  .requiredOption('-p, --password <password>', 'Admin password')
  .requiredOption('-n, --name <name>', 'Admin full name')
  .option('-r, --role <role>', 'User role', 'SuperAdmin')
  .parse();

const options = program.opts();

async function createAdminUser() {
  try {
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing required environment variables:');
      console.error('   - NEXT_PUBLIC_SUPABASE_URL');
      console.error('   - SUPABASE_SERVICE_ROLE_KEY');
      process.exit(1);
    }

    // Initialize Supabase admin client
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

    console.log('🔐 Creating SuperAdmin user...');

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('id, email')
      .eq('email', options.email)
      .single();

    if (existingUser) {
      console.error(`❌ User with email ${options.email} already exists`);
      process.exit(1);
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(options.password, saltRounds);

    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: options.email,
      password: options.password,
      email_confirm: true,
      user_metadata: {
        full_name: options.name,
        role: options.role
      }
    });

    if (authError) {
      console.error('❌ Failed to create auth user:', authError.message);
      process.exit(1);
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authUser.user.id,
        email: options.email,
        full_name: options.name,
        role: options.role,
        status: 'active',
        created_by: authUser.user.id, // Self-created
        last_login_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('❌ Failed to create user profile:', profileError.message);
      
      // Cleanup: delete the auth user if profile creation failed
      await supabase.auth.admin.deleteUser(authUser.user.id);
      process.exit(1);
    }

    console.log('✅ SuperAdmin user created successfully!');
    console.log(`📧 Email: ${options.email}`);
    console.log(`👤 Name: ${options.name}`);
    console.log(`🎭 Role: ${options.role}`);
    console.log(`🆔 User ID: ${authUser.user.id}`);
    console.log('');
    console.log('🚀 You can now login to the application with these credentials.');
    console.log('⚠️  Make sure to change the password after first login for security.');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
}

// Validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate password strength
function isStrongPassword(password) {
  return password.length >= 8;
}

// Validation
if (!isValidEmail(options.email)) {
  console.error('❌ Invalid email format');
  process.exit(1);
}

if (!isStrongPassword(options.password)) {
  console.error('❌ Password must be at least 8 characters long');
  process.exit(1);
}

// Run the script
createAdminUser();