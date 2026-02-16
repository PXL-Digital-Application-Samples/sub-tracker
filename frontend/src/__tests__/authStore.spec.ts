import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../stores/auth';
import api from '../services/api';

vi.mock('../services/api');

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    clear: () => { store = {}; },
    removeItem: (key: string) => { delete store[key]; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with logged out state', () => {
    const auth = useAuthStore();
    expect(auth.isLoggedIn).toBe(false);
  });

  it('should initialize with logged in state if localStorage is set', () => {
    localStorage.setItem('isLoggedIn', 'true');
    const auth = useAuthStore();
    expect(auth.isLoggedIn).toBe(true);
  });

  it('should update state on login', () => {
    const auth = useAuthStore();
    auth.login();
    expect(auth.isLoggedIn).toBe(true);
    expect(localStorage.getItem('isLoggedIn')).toBe('true');
  });

  it('should update state on logout', () => {
    const auth = useAuthStore();
    auth.login();
    auth.logout();
    expect(auth.isLoggedIn).toBe(false);
    expect(localStorage.getItem('isLoggedIn')).toBeNull();
  });

  it('should check session and login if successful', async () => {
    const auth = useAuthStore();
    vi.mocked(api.getUser).mockResolvedValue({ id: 1, email: 'test@test.com' } as any);
    
    await auth.checkSession();
    expect(auth.isLoggedIn).toBe(true);
    expect(api.getUser).toHaveBeenCalled();
  });

  it('should check session and logout if failed', async () => {
    const auth = useAuthStore();
    auth.login();
    vi.mocked(api.getUser).mockRejectedValue(new Error('401'));
    
    await auth.checkSession();
    expect(auth.isLoggedIn).toBe(false);
  });
});
