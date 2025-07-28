#!/bin/bash

# Project Sentinel - Quick Development Setup with Dummy Data
# This script sets up a local database with test data for immediate frontend testing

set -e

echo "🎯 Project Sentinel - Development Setup with Dummy Data"
echo "======================================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

echo "✅ Docker is running"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the Project Sentinel directory"
    exit 1
fi

# Set up development environment
echo "📋 Setting up development environment..."
cp .env.development .env.local
echo "✅ Created .env.local for development"

# Clean up any existing containers
echo ""
echo "🧹 Cleaning up existing containers..."
docker-compose -f docker-compose.dev.yml down -v 2>/dev/null || true

# Start the database
echo ""
echo "🗄️  Starting PostgreSQL database with pgvector..."
docker-compose -f docker-compose.dev.yml up -d

echo "⏳ Waiting for database to be ready..."
for i in {1..30}; do
    if docker-compose -f docker-compose.dev.yml exec -T db pg_isready -U sentinel_user -d sentinel_dev > /dev/null 2>&1; then
        echo "✅ Database is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Database failed to start after 30 seconds"
        exit 1
    fi
    sleep 1
done

# Check if data was loaded
echo ""
echo "📊 Verifying data setup..."
DATA_CHECK=$(docker-compose -f docker-compose.dev.yml exec -T db psql -U sentinel_user -d sentinel_dev -c "SELECT COUNT(*) FROM user_profiles;" -t 2>/dev/null | tr -d ' \n' || echo "0")

if [ "$DATA_CHECK" -gt "0" ]; then
    echo "✅ Database populated with $DATA_CHECK test users"
else
    echo "❌ Database setup failed - no test data found"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing dependencies..."
    npm install --legacy-peer-deps
fi

echo ""
echo "🎉 Development Setup Complete!"
echo ""
echo "🚀 Next Steps:"
echo "1. Start the development server:"
echo "   npm run dev"
echo ""
echo "2. Open your browser and go to:"
echo "   http://localhost:3000/dev-login"
echo ""
echo "3. Choose any test account to login and explore!"
echo ""
echo "👥 Available Test Accounts:"
echo "   • admin@party.com (SuperAdmin) - Full system access"
echo "   • leader@party.com (PartyHead) - National analytics"
echo "   • north.lead@party.com (RegionalLead) - Regional management"
echo "   • mp.delhi@party.com (Member) - MP dashboard"
echo "   • worker1@party.com (Karyakartha) - Ground worker tools"
echo ""
echo "📊 Database Info:"
echo "   • Host: localhost:5433"
echo "   • Database: sentinel_dev"
echo "   • Username: sentinel_user"
echo "   • Password: sentinel_pass"
echo ""
echo "🛠️  Useful Commands:"
echo "   • Stop database: docker-compose -f docker-compose.dev.yml down"
echo "   • View logs: docker-compose -f docker-compose.dev.yml logs -f"
echo "   • Reset data: ./setup-dev.sh (runs this script again)"
echo ""
echo "💡 The frontend is now ready to test with realistic dummy data!"
echo "   No need for real API keys - everything works with mock data."
echo ""