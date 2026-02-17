<template>
  <div class="dashboard">
    <h1>Dashboard</h1>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="data">
      <div class="summary-grid">
        <div class="card summary-card">
          <h3>Total Active</h3>
          <p class="summary-value">{{ data.total_active }}</p>
        </div>
        <div class="card summary-card">
          <h3>Monthly Cost</h3>
          <p class="summary-value">{{ formatPrice(data.total_monthly_cost) }}</p>
        </div>
        <div class="card summary-card">
          <h3>Yearly Cost</h3>
          <p class="summary-value">{{ formatPrice(data.total_yearly_cost) }}</p>
        </div>
      </div>
      
      <div class="card list-card">
        <h2>Recent Active Subscriptions</h2>
        <ul v-if="data.subscriptions.length > 0" class="sub-list">
          <li v-for="sub in data.subscriptions" :key="sub.id" class="sub-item">
            <span class="company">{{ sub.company_name }}</span>
            <span class="price">{{ formatPrice(sub.price) }} / {{ sub.subscription_type }}</span>
            <span class="date">Started: {{ formatDate(sub.start_date) }}</span>
          </li>
        </ul>
        <p v-else>No active subscriptions found.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.summary-card {
  text-align: center;
}

.summary-value {
  font-size: 2rem;
  font-weight: bold;
  margin-top: 0.5rem;
  color: #007bff;
}

.sub-list {
  list-style: none;
  padding: 0;
}

.sub-item {
  padding: 1rem 0;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.sub-item:last-child {
  border-bottom: none;
}

.company {
  font-weight: 600;
  flex: 1;
  min-width: 150px;
}

.price {
  color: #007bff;
  font-weight: 500;
}

.date {
  font-size: 0.875rem;
  color: var(--vt-c-text-light-2);
}

@media (prefers-color-scheme: dark) {
  .date {
    color: var(--vt-c-text-dark-2);
  }
}
</style>

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
