<template>
  <div class="container-narrow">
    <div class="card">
      <h1>Change Password</h1>
      <form @submit.prevent="handleChangePassword">
        <div>
          <label for="oldPassword">Old Password:</label>
          <input type="password" id="oldPassword" name="oldPassword" data-testid="old-password" v-model="oldPassword" required />
        </div>
        <div>
          <label for="newPassword">New Password:</label>
          <input type="password" id="newPassword" name="newPassword" v-model="newPassword" required />
        </div>
        <div>
          <label for="confirmPassword">Confirm New Password:</label>
          <input type="password" id="confirmPassword" name="confirmPassword" v-model="confirmPassword" required />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="successMessage" class="success">{{ successMessage }}</p>
        <button type="submit">Change Password</button>
      </form>
      <div class="actions">
        <router-link to="/profile">Back to Profile</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import api from '../services/api';

const oldPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const error = ref('');
const successMessage = ref('');

const handleChangePassword = async () => {
  error.value = '';
  successMessage.value = '';

  if (newPassword.value !== confirmPassword.value) {
    error.value = "New passwords do not match.";
    return;
  }

  if (newPassword.value.length < 6) {
    error.value = "Password must be at least 6 characters long.";
    return;
  }

  try {
    await api.updatePassword({
      oldPassword: oldPassword.value,
      newPassword: newPassword.value,
    });
    successMessage.value = 'Password changed successfully!';
    oldPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
  } catch (err: any) {
    error.value = err.message;
  }
};
</script>

<style scoped>
</style>
