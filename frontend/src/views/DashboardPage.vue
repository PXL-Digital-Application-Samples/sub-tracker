<template>
  <div>
    <h1>Dashboard</h1>
    <div v-if="loading">Loading...</div>
    <div v-if="error">{{ error }}</div>
    <div v-if="data">
      <h2>Summary</h2>
      <p>Total Active Subscriptions: {{ data.total_active }}</p>
      <p>Total Monthly Cost: ${{ data.total_monthly_cost.toFixed(2) }}</p>
      <p>Total Yearly Cost: ${{ data.total_yearly_cost.toFixed(2) }}</p>
      
      <h2>Active Subscriptions</h2>
      <ul>
        <li v-for="sub in data.subscriptions" :key="sub.id">
          {{ sub.company_name }} - ${{ sub.price.toFixed(2) }} / {{ sub.subscription_type }} (Started: {{ formatDate(sub.start_date) }})
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../services/api';

const data = ref(null);
const loading = ref(true);
const error = ref('');

const fetchData = async () => {
  try {
    loading.value = true;
    data.value = await api.getActiveSubscriptions();
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

onMounted(fetchData);
</script>
