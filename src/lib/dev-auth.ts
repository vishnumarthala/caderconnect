/**
 * Development Authentication Helper
 * This provides dummy authentication for testing the frontend with local database
 * WARNING: Only use this in development mode!
 */

export interface DevUser {
  id: string;
  email: string;
  name: string;
  role: 'SuperAdmin' | 'PartyHead' | 'RegionalLead' | 'Member' | 'Karyakartha';
  region?: string;
  constituency?: string;
}

export const DEV_USERS: DevUser[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'admin@party.com',
    name: 'System Administrator',
    role: 'SuperAdmin'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'leader@party.com',
    name: 'Party National Leader',
    role: 'PartyHead'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    email: 'north.lead@party.com',
    name: 'Northern Region Lead',
    role: 'RegionalLead',
    region: 'North'
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    email: 'south.lead@party.com',
    name: 'Southern Region Lead',
    role: 'RegionalLead',
    region: 'South'
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    email: 'mp.delhi@party.com',
    name: 'Raj Kumar Singh',
    role: 'Member',
    region: 'North',
    constituency: 'Delhi Central'
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    email: 'mla.mumbai@party.com',
    name: 'Priya Sharma',
    role: 'Member',
    region: 'West',
    constituency: 'Mumbai North'
  },
  {
    id: '77777777-7777-7777-7777-777777777777',
    email: 'mp.chennai@party.com',
    name: 'Arjun Reddy',
    role: 'Member',
    region: 'South',
    constituency: 'Chennai South'
  },
  {
    id: '88888888-8888-8888-8888-888888888888',
    email: 'worker1@party.com',
    name: 'Amit Patel',
    role: 'Karyakartha',
    region: 'North'
  },
  {
    id: '99999999-9999-9999-9999-999999999999',
    email: 'worker2@party.com',
    name: 'Sunita Devi',
    role: 'Karyakartha',
    region: 'South'
  }
];

export function getDevUser(email: string): DevUser | null {
  return DEV_USERS.find(user => user.email === email) || null;
}

export function getAllDevUsers(): DevUser[] {
  return DEV_USERS;
}

export function createDevSession(user: DevUser) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('dev_user', JSON.stringify(user));
    localStorage.setItem('dev_session_expires', (Date.now() + 24 * 60 * 60 * 1000).toString());
  }
}

export function getDevSession(): DevUser | null {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('dev_user');
    const expiresStr = localStorage.getItem('dev_session_expires');
    
    if (userStr && expiresStr) {
      const expires = parseInt(expiresStr);
      if (Date.now() < expires) {
        return JSON.parse(userStr);
      }
    }
  }
  return null;
}

export function clearDevSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('dev_user');
    localStorage.removeItem('dev_session_expires');
  }
}