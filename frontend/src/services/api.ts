import type {
  User,
  ActiveSubscriptionsResponse,
  HistorySubscriptionsResponse,
  LoginCredentials,
  PasswordUpdate,
  UserUpdate,
  SubscriptionCreate,
} from '../types';

const API_URL = '/api';

let onUnauthorized: (() => void) | null = null;
let csrfToken: string | null = null;

export async function initCsrf() {
  const response = await fetch(`${API_URL}/csrf-token`, { credentials: 'include' });
  const data = await response.json();
  csrfToken = data.token;
}

export function setCsrfToken(token: string) {
  csrfToken = token;
}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

interface ExtendedRequestInit extends RequestInit {
  skip401Redirect?: boolean;
}

async function fetchApi(path: string, options: ExtendedRequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (csrfToken) {
    headers['x-csrf-token'] = csrfToken;
  }

  const { skip401Redirect, ...fetchOptions } = options;

  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers,
    ...fetchOptions,
  };

  const response = await fetch(`${API_URL}${path}`, defaultOptions);

  if (response.status === 401 && !skip401Redirect) {
    if (onUnauthorized) {
      onUnauthorized();
    } else {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Something went wrong');
  }

  if (response.status === 204) {
    return;
  }

  return response.json();
}

export default {
  login: (credentials: LoginCredentials) =>
    fetchApi('/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      skip401Redirect: true,
    }),
  logout: () => fetchApi('/logout', { method: 'POST' }),

  getUser: () => fetchApi('/user') as Promise<User>,
  updateUser: (userData: UserUpdate) =>
    fetchApi('/user', {
      method: 'PUT',
      body: JSON.stringify(userData),
    }),
  updatePassword: (passwords: PasswordUpdate) =>
    fetchApi('/user/password', {
      method: 'PUT',
      body: JSON.stringify(passwords),
    }),

  getActiveSubscriptions: (page = 1, limit = 20) =>
    fetchApi(`/subscriptions/active?page=${page}&limit=${limit}`) as Promise<ActiveSubscriptionsResponse>,
  getSubscriptionHistory: (page = 1, limit = 20) =>
    fetchApi(`/subscriptions/history?page=${page}&limit=${limit}`) as Promise<HistorySubscriptionsResponse>,
  createSubscription: (subData: SubscriptionCreate) =>
    fetchApi('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(subData),
    }),
  updateSubscription: (id: number, subData: SubscriptionCreate) =>
    fetchApi(`/subscriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(subData),
    }),
  cancelSubscription: (id: number) =>
    fetchApi(`/subscriptions/${id}/cancel`, {
      method: 'POST',
    }),
  deleteSubscription: (id: number) => fetchApi(`/subscriptions/${id}`, { method: 'DELETE' }),
};
