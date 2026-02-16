const API_URL = 'http://localhost:3000/api';

async function fetchApi(path, options = {}) {
  const { needsAuth = true } = options;
  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  };

  const response = await fetch(`${API_URL}${path}`, defaultOptions);

  if (response.status === 401) {
    // Redirect to login or handle unauthorized access
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
  login: (credentials) => fetchApi('/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
    needsAuth: false,
  }),
  logout: () => fetchApi('/logout', { method: 'POST' }),

  getUser: () => fetchApi('/user'),
  updateUser: (userData) => fetchApi('/user', {
    method: 'PUT',
    body: JSON.stringify(userData),
  }),
  updatePassword: (passwords) => fetchApi('/user/password', {
    method: 'PUT',
    body: JSON.stringify(passwords),
  }),

  getActiveSubscriptions: () => fetchApi('/subscriptions/active'),
  getSubscriptionHistory: () => fetchApi('/subscriptions/history'),
  createSubscription: (subData) => fetchApi('/subscriptions', {
    method: 'POST',
    body: JSON.stringify(subData),
  }),
  updateSubscription: (id, subData) => fetchApi(`/subscriptions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(subData),
  }),
  deleteSubscription: (id) => fetchApi(`/subscriptions/${id}`, { method: 'DELETE' }),
};
