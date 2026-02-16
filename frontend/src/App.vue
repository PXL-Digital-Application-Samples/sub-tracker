<template>
  <div id="app">
    <header v-if="isLoggedIn">
      <nav>
        <RouterLink to="/">Dashboard</RouterLink>
        <RouterLink to="/subscriptions">Subscriptions</RouterLink>
        <RouterLink to="/subscriptions/history">History</RouterLink>
        <RouterLink to="/profile">Profile</RouterLink>
        <button @click="handleLogout">Logout</button>
      </nav>
    </header>
    <main>
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { RouterLink, RouterView, useRouter } from 'vue-router';
import api from './services/api';

const router = useRouter();
const isLoggedIn = ref(!!localStorage.getItem('isLoggedIn'));

const handleLogout = async () => {
  try {
    await api.logout();
  } catch (error) {
    console.error('Logout failed', error);
  } finally {
    localStorage.removeItem('isLoggedIn');
    isLoggedIn.value = false;
    router.push('/login');
  }
};

// Watch for route changes to update the isLoggedIn status
watch(
  () => router.currentRoute.value,
  () => {
    isLoggedIn.value = !!localStorage.getItem('isLoggedIn');
  }
);
</script>

<style scoped>
header {
  background-color: #f8f9fa;
  padding: 1rem;
  border-bottom: 1px solid #dee2e6;
}

nav {
  display: flex;
  gap: 1rem;
  align-items: center;
}

nav a {
  text-decoration: none;
  color: #007bff;
}

nav a.router-link-exact-active {
  font-weight: bold;
  color: #0056b3;
}

button {
  margin-left: auto;
}
</style>

