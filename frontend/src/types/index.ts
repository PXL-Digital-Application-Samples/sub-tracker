export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  zipcode: string;
}

export interface Subscription {
  id: number;
  user_id: number;
  company_name: string;
  description: string;
  price: number;
  subscription_type: 'monthly' | 'yearly' | 'lifetime';
  start_date: string;
  cancelled_at: string | null;
  created_at: string;
}

export interface ActiveSubscriptionsResponse {
  subscriptions: Subscription[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  total_active: number;
  total_monthly_cost: number;
  total_yearly_cost: number;
}

export interface HistorySubscriptionsResponse {
  subscriptions: Subscription[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface PasswordUpdate {
  oldPassword: string;
  newPassword: string;
}

export type UserUpdate = Omit<User, 'id'>;
export type SubscriptionCreate = Omit<Subscription, 'id' | 'user_id' | 'created_at'>;
