import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../services/api';

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref(!!localStorage.getItem('isLoggedIn'));

  function login() {
    localStorage.setItem('isLoggedIn', 'true');
    isLoggedIn.value = true;
  }

  function logout() {
    localStorage.removeItem('isLoggedIn');
    isLoggedIn.value = false;
  }

  async function checkSession() {
    try {
      await api.getUser();
      login();
    } catch {
      logout();
    }
  }

  return { isLoggedIn, login, logout, checkSession };
});
