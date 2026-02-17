import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import SubscriptionsPage from '../views/SubscriptionsPage.vue';
import api from '../services/api';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';

vi.mock('../services/api');

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/subscriptions', component: { template: '<div></div>' } }]
});

describe('SubscriptionsPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders subscriptions table', async () => {
    const mockSubs = {
      subscriptions: [
        { id: 1, company_name: 'Netflix', price: 1500, subscription_type: 'monthly', start_date: '2026-01-01', cancelled_at: null }
      ],
      total: 1
    };
    (api.getActiveSubscriptions as any).mockResolvedValue(mockSubs);

    const wrapper = mount(SubscriptionsPage, {
      global: {
        plugins: [router]
      }
    });

    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Loading...'));
    expect(wrapper.text()).toContain('Netflix');
    expect(wrapper.text()).toContain('€15.00');
  });

  it('shows empty state when no subscriptions', async () => {
    (api.getActiveSubscriptions as any).mockResolvedValue({ subscriptions: [], total: 0 });

    const wrapper = mount(SubscriptionsPage, {
      global: {
        plugins: [router]
      }
    });

    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Loading...'));
    expect(wrapper.text()).toContain('No active subscriptions.');
  });
});
