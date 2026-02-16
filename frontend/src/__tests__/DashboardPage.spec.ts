import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import DashboardPage from '../views/DashboardPage.vue';
import api from '../services/api';

vi.mock('../services/api');

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', async () => {
    (api.getActiveSubscriptions as any).mockReturnValue(new Promise(() => {}));
    const wrapper = mount(DashboardPage);
    expect(wrapper.text()).toContain('Loading...');
  });

  it('renders subscription summary', async () => {
    const mockData = {
      total_active: 2,
      total_monthly_cost: 2500,
      total_yearly_cost: 30000,
      subscriptions: [
        { id: 1, company_name: 'Netflix', price: 1500, subscription_type: 'monthly', start_date: '2026-01-01' },
        { id: 2, company_name: 'Spotify', price: 1000, subscription_type: 'monthly', start_date: '2026-01-01' }
      ]
    };
    (api.getActiveSubscriptions as any).mockResolvedValue(mockData);
    
    const wrapper = mount(DashboardPage);
    
    // Wait for the next tick for the onMounted call to finish
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Loading...'));

    expect(wrapper.text()).toContain('Total Active');
    expect(wrapper.text()).toContain('2');
    expect(wrapper.text()).toContain('Monthly Cost');
    expect(wrapper.text()).toContain('$25.00');
    expect(wrapper.text()).toContain('Netflix');
    expect(wrapper.text()).toContain('Spotify');
  });

  it('shows error state', async () => {
    (api.getActiveSubscriptions as any).mockRejectedValue(new Error('Fetch failed'));
    const wrapper = mount(DashboardPage);
    
    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Loading...'));
    expect(wrapper.text()).toContain('Fetch failed');
  });
});
