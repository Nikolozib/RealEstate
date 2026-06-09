export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  phone: string;
  role: 'user' | 'agent' | 'admin';
  savedProperties: string[];
  createdAt: any;
  lastLoginAt: any;
}