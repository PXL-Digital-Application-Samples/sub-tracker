import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import SubscriptionModal from '../components/SubscriptionModal.vue';
import api from '../services/api';

vi.mock('../services/api');

describe('SubscriptionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders in Add mode when no subscription prop', () => {
    const wrapper = mount(SubscriptionModal);
    expect(wrapper.find('h2').text()).toBe('Add Subscription');
    expect(wrapper.find('button[type="submit"]').text()).toBe('Create');
  });

  it('renders in Edit mode with subscription prop', () => {
    const sub = { id: 1, company_name: 'Netflix', price: 1500, subscription_type: 'monthly', start_date: '2026-01-01' };
    const wrapper = mount(SubscriptionModal, {
      props: { subscription: sub as any }
    });
    expect(wrapper.find('h2').text()).toBe('Edit Subscription');
    expect((wrapper.find('input[required]').element as HTMLInputElement).value).toBe('Netflix');
    expect(wrapper.find('button[type="submit"]').text()).toBe('Save');
  });

  it('emits saved and close on successful submit', async () => {
    (api.createSubscription as any).mockResolvedValue({});
    const wrapper = mount(SubscriptionModal);
    
    await wrapper.find('input[type="number"]').setValue(15.99);
    await wrapper.find('input[required]').setValue('Test Co');
    await wrapper.find('input[type="date"]').setValue('2026-01-01');
    
    await wrapper.find('form').trigger('submit.prevent');
    
    expect(api.createSubscription).toHaveBeenCalled();
    expect(wrapper.emitted()).toHaveProperty('saved');
    expect(wrapper.emitted()).toHaveProperty('close');
  });
});
