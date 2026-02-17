import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import HistoryPage from '../views/HistoryPage.vue';
import api from '../services/api';

vi.mock('../services/api');

describe('HistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders history table', async () => {
    const mockHistory = {
      subscriptions: [
        { id: 1, company_name: 'Old Sub', price: 1000, subscription_type: 'monthly', start_date: '2025-01-01', cancelled_at: '2025-06-01' }
      ],
      total: 1
    };
    (api.getSubscriptionHistory as any).mockResolvedValue(mockHistory);

    const wrapper = mount(HistoryPage);

    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Loading...'));
    expect(wrapper.text()).toContain('Old Sub');
    expect(wrapper.text()).toContain('€10.00');
  });

  it('shows empty state when no history', async () => {
    (api.getSubscriptionHistory as any).mockResolvedValue({ subscriptions: [], total: 0 });

    const wrapper = mount(HistoryPage);

    await vi.waitFor(() => expect(wrapper.text()).not.toContain('Loading...'));
    expect(wrapper.text()).toContain('No historical subscriptions.');
  });
});
