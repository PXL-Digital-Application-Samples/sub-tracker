<template>
  <div>
    <h1>Subscription History</h1>
    <div v-if="loading">Loading...</div>
    <div v-if="error">{{ error }}</div>
    <table v-if="subscriptions.length">
      <thead>
        <tr>
          <th>Company</th>
          <th>Price</th>
          <th>Type</th>
          <th>Start Date</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="sub in subscriptions" :key="sub.id">
          <td>{{ sub.company_name }}</td>
          <td>${{ sub.price.toFixed(2) }}</td>
          <td>{{ sub.subscription_type }}</td>
          <td>{{ formatDate(sub.start_date) }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else>No historical subscriptions.</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../services/api';

const subscriptions = ref([]);
const loading = ref(true);
const error = ref('');

const fetchHistory = async () => {
  try {
    loading.value = true;
    subscriptions.value = await api.getSubscriptionHistory();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

onMounted(fetchHistory);
</script>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}
th, td {
  border: 1px solid #ccc;
  padding: 0.75rem;
  text-align: left;
}
</style>
