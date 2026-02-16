<template>
  <div class="container-narrow">
    <div class="card">
      <h1>Profile</h1>
      <div v-if="loading">Loading...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <form v-else-if="user" @submit.prevent="handleUpdate">
        <div>
          <label>Email</label>
          <input type="email" name="email" v-model="user.email" required />
        </div>
        <div>
          <label>First Name</label>
          <input name="first_name" v-model="user.first_name" required />
        </div>
        <div>
          <label>Last Name</label>
          <input name="last_name" v-model="user.last_name" required />
        </div>
        <div>
          <label>Zipcode</label>
          <input name="zipcode" v-model="user.zipcode" required />
        </div>
        <p v-if="successMessage" class="success">{{ successMessage }}</p>
        <button type="submit">Save Changes</button>
      </form>
      <div class="actions">
        <router-link to="/profile/password">Change Password</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '../services/api';
import type { User } from '../types';

const user = ref<User | null>(null);
const loading = ref(true);
const error = ref('');
const successMessage = ref('');

const fetchUser = async () => {
  try {
    loading.value = true;
    user.value = await api.getUser();
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

const handleUpdate = async () => {
  if (!user.value) return;
  
  error.value = '';
  successMessage.value = '';
  try {
    await api.updateUser(user.value);
    successMessage.value = 'Profile updated successfully!';
  } catch (err: any) {
    error.value = err.message;
  }
};

onMounted(fetchUser);
</script>

<style scoped>
</style>
