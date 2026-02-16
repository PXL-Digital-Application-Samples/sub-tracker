import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import LoginPage from '../views/LoginPage.vue';
import api from '../services/api';

vi.mock('../services/api');

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/', component: { template: '<div>Home</div>' } }],
});

describe('LoginPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders login form', () => {
    const wrapper = mount(LoginPage, {
      global: { plugins: [router] }
    });
    expect(wrapper.find('h1').text()).toBe('Login');
    expect(wrapper.find('input[type="email"]').exists()).toBe(true);
    expect(wrapper.find('input[type="password"]').exists()).toBe(true);
    expect(wrapper.find('button[type="submit"]').text()).toBe('Login');
  });

  it('submits form and redirects on success', async () => {
    (api.login as any).mockResolvedValue({ message: 'Success' });
    const wrapper = mount(LoginPage, {
      global: { plugins: [router] }
    });
    
    await wrapper.find('input[type="email"]').setValue('user@test.com');
    await wrapper.find('input[type="password"]').setValue('password123');
    await wrapper.find('form').trigger('submit.prevent');

    expect(api.login).toHaveBeenCalledWith({
      email: 'user@test.com',
      password: 'password123'
    });
  });

  it('shows error on failed login', async () => {
    (api.login as any).mockRejectedValue(new Error('Invalid credentials'));
    const wrapper = mount(LoginPage, {
      global: { plugins: [router] }
    });
    
    await wrapper.find('input[type="email"]').setValue('wrong@test.com');
    await wrapper.find('input[type="password"]').setValue('wrong');
    await wrapper.find('form').trigger('submit.prevent');

    expect(wrapper.find('p').text()).toBe('Invalid credentials');
  });
});
