import AsyncStorage from '@react-native-async-storage/async-storage';

// Use production backend URL only
const BACKEND_URL = 'https://gs-pinnacle-backend.onrender.com';

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem('token');
  const headers: any = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'Something went wrong');
  }
  return data;
}

export function formatPrice(price: number): string {
  if (price === 0) return 'Free';
  return `₹${price.toLocaleString('en-IN')}`;
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function getCourseTypeBadge(type: string) {
  switch (type) {
    case 'live': return { label: 'LIVE', color: '#DC2626', bg: '#FEF2F2' };
    case 'recorded': return { label: 'RECORDED', color: '#2563EB', bg: '#EFF6FF' };
    case 'free': return { label: 'FREE', color: '#059669', bg: '#ECFDF5' };
    default: return { label: type.toUpperCase(), color: '#64748B', bg: '#F1F5F9' };
  }
}
