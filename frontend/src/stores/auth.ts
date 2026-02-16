import { defineStore } from 'pinia';
import { ref } from 'vue';

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

  return { isLoggedIn, login, logout };
});
