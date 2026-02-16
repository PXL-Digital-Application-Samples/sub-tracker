<template>
  <div>
    <h1>Dashboard</h1>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">{{ error }}</div>
    <div v-else-if="data">
      <h2>Summary</h2>
      <p>Total Active Subscriptions: {{ data.total_active }}</p>
      <p>Total Monthly Cost: ${{ formatPrice(data.total_monthly_cost) }}</p>
      <p>Total Yearly Cost: ${{ formatPrice(data.total_yearly_cost) }}</p>
      
      <h2>Active Subscriptions</h2>
      <ul>
        <li v-for="sub in data.subscriptions" :key="sub.id">
          {{ sub.company_name }} - ${{ formatPrice(sub.price) }} / {{ sub.subscription_type }} (Started: {{ formatDate(sub.start_date) }})
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '../services/api';
import type { ActiveSubscriptionsResponse } from '../types';
import { formatDate, formatPrice } from '../utils/format';

const data = ref<ActiveSubscriptionsResponse | null>(null);
const loading = ref(true);
const error = ref('');

const fetchData = async () => {
  try {
    loading.value = true;
    data.value = await api.getActiveSubscriptions();
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

onMounted(fetchData);
</script>
