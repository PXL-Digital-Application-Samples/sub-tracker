<template>
  <div id="app">
    <header v-if="authStore.isLoggedIn">
      <nav>
        <button class="nav-toggle" @click="navOpen = !navOpen">☰</button>
        <div class="nav-links" :class="{ open: navOpen }">
          <RouterLink to="/" @click="navOpen = false">Dashboard</RouterLink>
          <RouterLink to="/subscriptions" @click="navOpen = false">Subscriptions</RouterLink>
          <RouterLink to="/subscriptions/history" @click="navOpen = false">History</RouterLink>
          <RouterLink to="/profile" @click="navOpen = false">Profile</RouterLink>
          <button @click="handleLogout" class="logout-btn">Logout</button>
        </div>
      </nav>
    </header>
    <main>
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink, RouterView, useRouter } from 'vue-router';
import api from './services/api';
import { useAuthStore } from './stores/auth';

const router = useRouter();
const authStore = useAuthStore();
const navOpen = ref(false);

const handleLogout = async () => {
  try {
    await api.logout();
  } catch (error) {
    console.error('Logout failed', error);
  } finally {
    authStore.logout();
    router.push('/login');
  }
};
</script>

<style scoped>
header {
  background-color: var(--color-header-bg);
  padding: 1rem;
  border-bottom: 1px solid var(--color-header-border);
}

nav {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.nav-links {
  display: flex;
  gap: 1rem;
  align-items: center;
  width: 100%;
}

.nav-toggle {
  display: none;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--color-text);
  padding: 0;
}

.logout-btn {
  margin-left: auto;
}

nav a {
  text-decoration: none;
  color: #007bff;
}

nav a.router-link-exact-active {
  font-weight: bold;
  color: #0056b3;
}

@media (max-width: 768px) {
  .nav-toggle {
    display: block;
  }

  .nav-links {
    display: none;
    flex-direction: column;
    align-items: flex-start;
    position: absolute;
    top: 60px;
    left: 0;
    background-color: var(--color-header-bg);
    padding: 1rem;
    border-bottom: 1px solid var(--color-header-border);
    z-index: 100;
  }

  .nav-links.open {
    display: flex;
  }

  .logout-btn {
    margin-left: 0;
    width: 100%;
  }
}
</style>

