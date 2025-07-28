#!/bin/bash

# Project Sentinel Setup Script
# This script will help you get Project Sentinel running quickly

set -e

echo "🎯 Project Sentinel Setup"
echo "=========================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the Project Sentinel directory"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -c2-)
MAJOR_VERSION=$(echo $NODE_VERSION | cut -d. -f1)

if [ "$MAJOR_VERSION" -lt "18" ]; then
    echo "❌ Error: Node.js 18+ is required. You have version $NODE_VERSION"
    echo "   Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $NODE_VERSION"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo ""
    echo "📋 Setting up environment configuration..."
    cp .env.example .env.local
    echo "✅ Created .env.local from template"
    echo ""
    echo "⚠️  IMPORTANT: Please edit .env.local and add your:"
    echo "   - Supabase URL and keys"
    echo "   - OpenAI API key"
    echo "   - JWT secret (use: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\")"
    echo ""
    read -p "Press Enter when you've configured .env.local..."
fi

# Clean and install dependencies
echo ""
echo "📦 Installing dependencies..."
rm -rf node_modules package-lock.json 2>/dev/null || true
npm install --legacy-peer-deps

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"

# Check environment variables
echo ""
echo "🔍 Checking environment configuration..."

if ! grep -q "NEXT_PUBLIC_SUPABASE_URL=https://" .env.local; then
    echo "⚠️  Warning: NEXT_PUBLIC_SUPABASE_URL not configured"
fi

if ! grep -q "OPENAI_API_KEY=sk-" .env.local; then
    echo "⚠️  Warning: OPENAI_API_KEY not configured"
fi

if ! grep -q "JWT_SECRET=" .env.local | grep -v "your-very-long"; then
    echo "⚠️  Warning: JWT_SECRET not configured"
fi

# Database setup check
echo ""
echo "🗄️  Database Setup:"
echo "   If using Supabase:"
echo "   1. Run the SQL files in your Supabase SQL Editor:"
echo "      - database/schema.sql"
echo "      - database/vector-functions.sql"
echo ""
echo "   If using local PostgreSQL:"
echo "      npm run db:setup"
echo ""

# Final instructions
echo "🚀 Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Configure your .env.local file (if not done)"
echo "2. Set up your database (Supabase or local)"
echo "3. Create admin user: npm run create-admin -- --email admin@yourparty.com --password secure123 --name \"Admin User\""
echo "4. Start development server: npm run dev"
echo "5. Open http://localhost:3000"
echo ""
echo "📚 Documentation:"
echo "   - QUICK_START.md - Complete setup guide"
echo "   - DEPLOYMENT_GUIDE.md - Production deployment"
echo "   - PROJECT_STATUS.md - Current status and known issues"
echo ""
echo "🎉 Project Sentinel is ready!"