# 🚀 Project Sentinel - Quick Start Guide

This guide will get you up and running with Project Sentinel in under 10 minutes.

## ✅ Prerequisites Checklist

Before starting, make sure you have:

- [ ] **Node.js 18+** installed ([Download here](https://nodejs.org/))
- [ ] **Docker & Docker Compose** installed ([Download here](https://www.docker.com/))
- [ ] **Supabase account** created ([Sign up here](https://supabase.com/))
- [ ] **OpenAI API key** obtained ([Get one here](https://platform.openai.com/))

## 🛠️ Step-by-Step Setup

### 1. Environment Configuration

Copy the environment template and configure your settings:

```bash
cp .env.example .env.local
```

**Required Environment Variables:**
```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI (Required)
OPENAI_API_KEY=sk-your-openai-api-key

# Security (Required)
JWT_SECRET=your-very-long-random-string-here
```

**Generate Security Keys:**
```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

**Option A: Using Supabase (Recommended)**

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the following SQL files in order:
   ```sql
   -- First, run the schema
   \i database/schema.sql
   
   -- Then, run the vector functions
   \i database/vector-functions.sql
   ```

**Option B: Using Local Docker**

```bash
# Start PostgreSQL with pgvector
docker-compose up -d db

# Wait for database to be ready, then run:
npm run db:setup
```

### 4. Create First Admin User

```bash
npm run create-admin -- --email admin@yourparty.com --password secure123 --name "Admin User"
```

### 5. Start Development Server

```bash
npm run dev
```

🎉 **Your application is now running at [http://localhost:3000](http://localhost:3000)**

## 🔐 First Login

1. Open [http://localhost:3000](http://localhost:3000)
2. Click "Login" 
3. Use the admin credentials you created:
   - **Email**: admin@yourparty.com
   - **Password**: secure123

⚠️ **Important**: Change the default password after first login!

## 🎯 What You Can Do Now

### SuperAdmin Features
- **User Management**: Create and manage user accounts
- **System Overview**: View platform-wide analytics
- **AI Chat**: Interact with the AI assistant
- **Document Upload**: Upload and process documents
- **Security Monitoring**: View audit logs and alerts

### Test the AI Features
1. Go to **AI Chat** in the sidebar
2. Try asking: *"Show me the latest sentiment analysis"*
3. Or: *"Generate a performance report for our members"*

### Upload Documents
1. Navigate to **Documents** section
2. Upload a PDF or Word document
3. The AI will process it and make it searchable

### Explore Analytics
1. Visit the **Dashboard**
2. See real-time metrics and visualizations
3. Use the **Sandbox** to create custom reports

## 🐳 Docker Deployment (Optional)

For production-like environment:

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

## 🔧 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run type checking
npm run type-check

# Format code
npm run format

# Lint code
npm run lint

# Create admin user
npm run create-admin

# Seed development data
npm run db:seed
```

## 🆘 Troubleshooting

### Common Issues

**"npm install" fails with Zod error**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Database connection error**
- Check your Supabase credentials in `.env.local`
- Ensure your Supabase project is active
- Verify the database URL is correct

**OpenAI API errors**
- Verify your API key is correct
- Check you have sufficient credits
- Ensure the API key has proper permissions

**Docker issues**
```bash
# Clean Docker resources
docker system prune -a

# Restart services
docker-compose restart
```

### Getting Help

1. **Check the logs**:
   ```bash
   # Development logs
   npm run dev
   
   # Docker logs
   docker-compose logs -f app
   ```

2. **Verify environment**:
   ```bash
   # Check if all required env vars are set
   node -e "
   const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY'];
   required.forEach(key => console.log(key + ':', process.env[key] ? '✅' : '❌'));
   "
   ```

3. **Database health check**:
   ```bash
   # Test database connection
   npm run db:test
   ```

## 📚 Next Steps

Once you have the basic setup working:

1. **Read the full documentation**:
   - [Deployment Guide](DEPLOYMENT_GUIDE.md) - Production deployment
   - [Backend Implementation](BACKEND_IMPLEMENTATION.md) - Technical details

2. **Explore the codebase**:
   - `/src/components` - UI components
   - `/src/app/api` - API endpoints
   - `/src/lib` - Core utilities and services

3. **Customize for your needs**:
   - Modify user roles in `/src/types/index.ts`
   - Adjust security settings in `/src/lib/config.ts`
   - Add custom analytics in the dashboard

4. **Deploy to production**:
   - Follow the [Deployment Guide](DEPLOYMENT_GUIDE.md)
   - Set up monitoring and backups
   - Configure SSL and security hardening

## 🎉 Success!

You now have a fully functional AI-powered political intelligence platform! 

**What's Next?**
- Invite team members and assign roles
- Upload your organization's documents
- Start using the AI assistant for strategic insights
- Set up alerts and monitoring
- Deploy to production when ready

---

**Need Help?** Check the troubleshooting section above or review the detailed documentation files in this repository.