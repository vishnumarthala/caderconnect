# Sentinel Login Credentials

## Development Test Accounts

Use these credentials to test different user roles and permissions:

### Super Admin
- **Email:** `admin@party.com`
- **Password:** `TestPassword123!`
- **Access:** Full system access, user management, security oversight

### Party Head  
- **Email:** `leader@party.com`
- **Password:** `TestPassword123!`
- **Access:** National-level analytics, strategic planning, party management

### Regional Lead
- **Email:** `north.lead@party.com`
- **Password:** `TestPassword123!`
- **Access:** Regional oversight, member coordination, local analytics

### Member (MP/MLA)
- **Email:** `mp.delhi@party.com`
- **Password:** `TestPassword123!`
- **Access:** Personal performance tracking, constituency management

### Karyakartha (Grassroots Worker)
- **Email:** `worker1@party.com`
- **Password:** `TestPassword123!`
- **Access:** Local task management, data collection, ground-level insights

## How to Login

1. Visit: `http://localhost:3000`
2. You'll be redirected to the login page
3. Click on any test account above to auto-fill credentials
4. Or manually type the email and password
5. Click "Sign In"

## Features by Role

- **Super Admin:** Access to all features, user management, system settings
- **Party Head:** National dashboard, all regional data, strategic insights
- **Regional Lead:** Regional dashboard, member management, local analytics
- **Member:** Personal dashboard, constituency data, AI assistance
- **Karyakartha:** Task management, local data input, basic analytics

## Development Notes

- All accounts use the same password for simplicity: `TestPassword123!`
- In development mode, the login form shows clickable credential buttons
- Each role has different dashboard views and permissions
- Authentication is handled with mock data in development mode