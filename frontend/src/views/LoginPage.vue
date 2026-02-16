<template>
  <div class="container-narrow">
    <div class="card">
      <h1>Login</h1>
      <form @submit.prevent="handleLogin">
        <div>
          <label for="email">Email:</label>
          <input type="email" id="email" data-testid="email" v-model="email" required />
        </div>
        <div>
          <label for="password">Password:</label>
          <input type="password" id="password" data-testid="password" v-model="password" required />
        </div>
        <button type="submit">Login</button>
        <p v-if="error" class="error">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';
import { useAuthStore } from '../stores/auth';

import { setCsrfToken } from '../services/api';

const email = ref('');
const password = ref('');
const error = ref('');
const router = useRouter();
const authStore = useAuthStore();

const handleLogin = async () => {
  try {
    const response = await api.login({ email: email.value, password: password.value });
    if (response.token) {
      setCsrfToken(response.token);
    }
    authStore.login();
    router.push('/');
  } catch (err: any) {
    error.value = err.message;
    authStore.logout();
  }
};
</script>
