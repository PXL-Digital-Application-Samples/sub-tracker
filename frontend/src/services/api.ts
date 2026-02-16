const API_URL = '/api';

interface FetchOptions extends RequestInit {
  needsAuth?: boolean;
}

async function fetchApi(path: string, options: FetchOptions = {}) {
  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  };

  const response = await fetch(`${API_URL}${path}`, defaultOptions);

  if (response.status === 401) {
    window.location.href = '/login';
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
  login: (credentials: any) => fetchApi('/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
    needsAuth: false,
  }),
  logout: () => fetchApi('/logout', { method: 'POST' }),

  getUser: () => fetchApi('/user'),
  updateUser: (userData: any) => fetchApi('/user', {
    method: 'PUT',
    body: JSON.stringify(userData),
  }),
  updatePassword: (passwords: any) => fetchApi('/user/password', {
    method: 'PUT',
    body: JSON.stringify(passwords),
  }),

  getActiveSubscriptions: () => fetchApi('/subscriptions/active'),
  getSubscriptionHistory: () => fetchApi('/subscriptions/history'),
  createSubscription: (subData: any) => fetchApi('/subscriptions', {
    method: 'POST',
    body: JSON.stringify(subData),
  }),
  updateSubscription: (id: string | number, subData: any) => fetchApi(`/subscriptions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(subToData(subData)),
  }),
  deleteSubscription: (id: string | number) => fetchApi(`/subscriptions/${id}`, { method: 'DELETE' }),
};

function subToData(sub: any) {
  const { id, user_id, created_at, total_active, total_monthly_cost, total_yearly_cost, ...data } = sub;
  return data;
}
