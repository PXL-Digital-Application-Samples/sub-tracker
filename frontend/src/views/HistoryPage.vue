<template>
  <div>
    <h1>Subscription History</h1>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">{{ error }}</div>
    <template v-else>
      <div class="table-container" v-if="subscriptions.length">
        <table>
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
                    <td>${{ formatPrice(sub.price) }}</td>
                    <td>{{ sub.subscription_type }}</td>
                    <td>{{ formatDate(sub.start_date) }}</td>
                  </tr>
                </tbody>                </table>
              </div>
              <p v-else>No historical subscriptions.</p>
            </template>  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '../services/api';
import type { Subscription } from '../types';
import { formatDate, formatPrice } from '../utils/format';

const subscriptions = ref<Subscription[]>([]);
const loading = ref(true);
const error = ref('');

const fetchHistory = async () => {
  try {
    loading.value = true;
    const response = await api.getSubscriptionHistory();
    subscriptions.value = response.subscriptions;
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
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
  border: 1px solid var(--color-table-border);
  padding: 0.75rem;
  text-align: left;
}
</style>
