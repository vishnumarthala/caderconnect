# 🚀 Project Sentinel - Complete Deployment Guide

Welcome to Project Sentinel, an AI-powered political strategy and intelligence platform. This guide will walk you through the complete deployment process from development to production.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Setup](#development-setup)
3. [Database Configuration](#database-configuration)
4. [Environment Configuration](#environment-configuration)
5. [Local Development](#local-development)
6. [Production Deployment](#production-deployment)
7. [Security Hardening](#security-hardening)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)

## ⚡ Prerequisites

### System Requirements
- **Node.js** 18.0+ and npm 9.0+
- **Docker** 20.0+ and Docker Compose 2.0+
- **PostgreSQL** 14+ with pgvector extension
- **Redis** 6.0+ (optional, for caching)
- **Git** for version control

### Third-Party Services
- **Supabase** account (database and auth)
- **OpenAI** API key (for AI features)
- **Docker Hub** account (for containerization)
- **AWS/GCP/Azure** account (for production hosting)

### Security Prerequisites
- SSL certificate for HTTPS
- Domain name for production deployment
- Firewall configuration knowledge
- Basic understanding of cloud security

## 🔧 Development Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd sentinel

# Install dependencies
npm install

# Install development tools
npm install -D @types/node typescript eslint prettier
```

### 2. Docker Setup

```bash
# Build the Docker image
docker build -t sentinel:latest .

# Verify Docker is working
docker --version
docker-compose --version
```

## 🗄️ Database Configuration

### 1. Supabase Setup

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note down your project URL and keys

2. **Enable pgvector Extension**
   ```sql
   -- In Supabase SQL Editor
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

3. **Run Database Migrations**
   ```bash
   # Apply the schema
   psql -d your_database_url -f database/schema.sql
   
   # Apply vector functions
   psql -d your_database_url -f database/vector-functions.sql
   ```

### 2. Local PostgreSQL (Alternative)

```bash
# Install PostgreSQL with pgvector
brew install postgresql pgvector  # macOS
# or
sudo apt-get install postgresql postgresql-contrib  # Ubuntu

# Start PostgreSQL
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Ubuntu

# Create database
createdb sentinel
psql sentinel -c "CREATE EXTENSION vector;"
```

## ⚙️ Environment Configuration

### 1. Copy Environment Template

```bash
cp .env.example .env.local
```

### 2. Configure Essential Variables

Edit `.env.local` with your values:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# Security
JWT_SECRET=generate-a-very-long-random-string
```

### 3. Generate Security Keys

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 💻 Local Development

### 1. Start Development Server

```bash
# Start the development server
npm run dev

# The application will be available at http://localhost:3000
```

### 2. Initialize Database

```bash
# Run database setup (if using local PostgreSQL)
npm run db:setup

# Seed initial data
npm run db:seed
```

### 3. Create First Admin User

```bash
# Create SuperAdmin user
npm run create-admin -- --email admin@yourparty.com --password secure123 --name "Admin User"
```

### 4. Development Tools

```bash
# Run tests
npm run test

# Lint code
npm run lint

# Type checking
npm run type-check

# Format code
npm run format
```

## 🌐 Production Deployment

### Option A: Docker Deployment

#### 1. Build Production Image

```bash
# Build optimized production image
docker build -t sentinel:prod -f Dockerfile.prod .

# Tag for registry
docker tag sentinel:prod your-registry/sentinel:latest
docker push your-registry/sentinel:latest
```

#### 2. Docker Compose Production

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  app:
    image: your-registry/sentinel:latest
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl/certs
    depends_on:
      - app
    restart: unless-stopped
```

#### 3. Deploy with Docker Compose

```bash
# Deploy to production
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Option B: Kubernetes Deployment

#### 1. Apply Kubernetes Manifests

```bash
# Apply all manifests
kubectl apply -f k8s-manifests.yaml

# Check deployment status
kubectl get pods -l app=sentinel

# Check services
kubectl get services
```

#### 2. Set up Ingress (HTTPS)

```bash
# Install cert-manager for SSL
kubectl apply -f https://github.com/jetstack/cert-manager/releases/download/v1.11.0/cert-manager.yaml

# Apply ingress configuration
kubectl apply -f k8s-ingress.yaml
```

### Option C: Cloud Deployment

#### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod

# Set environment variables
vercel env add
```

#### Railway Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway link
railway up
```

#### DigitalOcean App Platform

1. Connect your GitHub repository
2. Configure environment variables
3. Set build and run commands:
   - Build: `npm run build`
   - Run: `npm start`

## 🔒 Security Hardening

### 1. SSL/TLS Configuration

```nginx
# nginx.conf - SSL configuration
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    location / {
        proxy_pass http://app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. Firewall Configuration

```bash
# UFW configuration (Ubuntu)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Fail2ban for intrusion prevention
sudo apt-get install fail2ban
sudo systemctl enable fail2ban
```

### 3. Security Headers

```javascript
// next.config.js - Security headers
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' }
];
```

### 4. Database Security

```sql
-- Create read-only user for analytics
CREATE USER sentinel_analytics WITH PASSWORD 'secure_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO sentinel_analytics;

-- Restrict sensitive data access
CREATE POLICY user_data_policy ON users 
FOR ALL TO sentinel_app 
USING (auth.uid() = id OR auth.role() = 'admin');
```

## 📊 Monitoring & Maintenance

### 1. Health Checks

```bash
# Add to your deployment
# Health check endpoint: /api/health
curl -f http://localhost:3000/api/health || exit 1
```

### 2. Logging Configuration

```javascript
// Configure structured logging
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### 3. Backup Strategy

```bash
# Database backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="sentinel_backup_$DATE.sql"

pg_dump $DATABASE_URL > /backups/$BACKUP_FILE
aws s3 cp /backups/$BACKUP_FILE s3://your-backup-bucket/

# Keep last 30 days
find /backups -name "*.sql" -mtime +30 -delete
```

### 4. Monitoring Setup

```bash
# Install monitoring tools
npm install @sentry/nextjs prom-client

# Set up alerts
# - CPU usage > 80%
# - Memory usage > 85%
# - Response time > 2s
# - Error rate > 1%
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Database Connection Issues

```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT version();"

# Verify pgvector extension
psql $DATABASE_URL -c "SELECT extname FROM pg_extension WHERE extname = 'vector';"
```

#### 2. Docker Issues

```bash
# Clean Docker resources
docker system prune -a

# Check container logs
docker logs sentinel_app

# Restart services
docker-compose restart
```

#### 3. SSL Certificate Issues

```bash
# Test SSL configuration
openssl s_client -connect yourdomain.com:443

# Renew Let's Encrypt certificate
certbot renew --dry-run
```

#### 4. Performance Issues

```bash
# Check memory usage
docker stats

# Monitor database performance
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity;"

# Check disk space
df -h
```

### Error Recovery

#### Database Recovery

```bash
# Restore from backup
psql $DATABASE_URL < /backups/sentinel_backup_YYYYMMDD.sql

# Reset migrations
npm run db:reset
npm run db:migrate
```

#### Application Recovery

```bash
# Restart application
docker-compose restart app

# Check application health
curl -f http://localhost:3000/api/health

# View recent logs
docker-compose logs --tail=100 app
```

## 📞 Support & Maintenance

### Regular Maintenance Tasks

1. **Daily**
   - Check application health
   - Monitor error logs
   - Verify backup completion

2. **Weekly**
   - Update dependencies
   - Review security logs
   - Performance monitoring

3. **Monthly**
   - Security updates
   - Database optimization
   - Capacity planning

### Getting Help

- **Documentation**: Check this guide first
- **Logs**: Always check application and system logs
- **Health Checks**: Use built-in health endpoints
- **Community**: Check GitHub issues and discussions

### Production Checklist

Before going live, ensure:

- [ ] SSL certificate is valid and auto-renewing
- [ ] All environment variables are set
- [ ] Database backups are working
- [ ] Monitoring is configured
- [ ] Security headers are enabled
- [ ] Rate limiting is configured
- [ ] Error tracking is set up
- [ ] Health checks are working
- [ ] Load testing is completed
- [ ] Disaster recovery plan is documented

---

## 🎉 Congratulations!

Your Project Sentinel deployment is now complete! The platform is ready to provide AI-powered political intelligence and analytics to your organization.

For additional support or advanced configuration, refer to the technical documentation or reach out to the development team.

**Remember**: This is a security-sensitive application handling political data. Always follow security best practices and keep the system updated.