#!/bin/bash

# Setup test database for Sentinel application
# This script sets up a local PostgreSQL database with test data

set -e

echo "🚀 Setting up Sentinel test database..."

# Database configuration
DB_NAME="sentinel_dev"
DB_USER="sentinel_user"
DB_PASS="sentinel_pass"
DB_HOST="localhost"
DB_PORT="5433"

echo "📦 Database configuration:"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Host: $DB_HOST:$DB_PORT"

# Check if PostgreSQL is running
if ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER 2>/dev/null; then
    echo "❌ PostgreSQL is not running on $DB_HOST:$DB_PORT"
    echo "Please start PostgreSQL or run with Docker:"
    echo "  docker run --name sentinel-postgres -e POSTGRES_PASSWORD=$DB_PASS -e POSTGRES_USER=$DB_USER -e POSTGRES_DB=$DB_NAME -p $DB_PORT:5432 -d postgres:15"
    exit 1
fi

echo "✅ PostgreSQL is running"

# Create database if it doesn't exist
echo "🔧 Creating database if needed..."
createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME 2>/dev/null || echo "Database already exists"

# Run schema setup
echo "🏗️  Setting up database schema..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/schema.sql

# Run seed data
echo "🌱 Inserting test data..."
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database/proper-seed.sql

echo "✅ Database setup complete!"
echo ""
echo "🔑 Test accounts created:"
echo "  Admin: admin@party.com / TestPassword123!"
echo "  Leader: leader@party.com / TestPassword123!"
echo "  Regional: north.lead@party.com / TestPassword123!"
echo "  Member: mp.delhi@party.com / TestPassword123!"
echo ""
echo "🌐 You can now:"
echo "  1. Start the app: npm run dev"
echo "  2. Use dev-login for quick testing"
echo "  3. Use /auth/login for production authentication"
echo ""
echo "📝 Note: The app will auto-redirect to dev-login in development mode"