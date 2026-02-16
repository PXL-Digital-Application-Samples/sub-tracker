<template>
  <div>
    <h1>Active Subscriptions</h1>
    <button @click="openAddModal">Add Subscription</button>
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
          <tr v-for="sub in subscriptions" :key="sub.id">
            <td>{{ sub.company_name }}</td>
            <td>${{ formatPrice(sub.price) }}</td>
            <td>{{ sub.subscription_type }}</td>
            <td>{{ formatDate(sub.start_date) }}</td>
            <td>
              <div class="actions" style="margin-top: 0">
                <button @click="openEditModal(sub)">Edit</button>
                <button class="btn-warning" @click="handleCancel(sub.id)">Cancel</button>
                <button class="btn-danger" @click="handleDelete(sub.id)">Delete</button>
              </div>
            </td>
          </tr>
                  </tbody>
                        </table>
                      </div>
                      <p v-else>No active subscriptions.</p>
                
                      <div class="pagination" v-if="totalPages > 1">
                        <button :disabled="currentPage === 1" @click="fetchSubscriptions(currentPage - 1)">Previous</button>
                        <span>Page {{ currentPage }} of {{ totalPages }}</span>
                        <button :disabled="currentPage === totalPages" @click="fetchSubscriptions(currentPage + 1)">Next</button>
                      </div>
                    </template>
                    <SubscriptionModal
      v-if="isModalOpen"
      :subscription="selectedSubscription"
      @close="closeModal"
      @saved="fetchSubscriptions"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';
import SubscriptionModal from '../components/SubscriptionModal.vue';
import type { Subscription } from '../types';
import { formatDate, formatPrice } from '../utils/format';

const props = defineProps<{
  id?: string | null;
}>();

const subscriptions = ref<Subscription[]>([]);
const loading = ref(true);
const error = ref('');
const isModalOpen = ref(false);
const selectedSubscription = ref<Subscription | null>(null);
const router = useRouter();

const currentPage = ref(1);
const totalPages = ref(1);

const fetchSubscriptions = async (page = 1) => {
  try {
    loading.value = true;
    const response = await api.getActiveSubscriptions(page);
    subscriptions.value = response.subscriptions;
    totalPages.value = response.totalPages;
    currentPage.value = response.page;

    if (props.id && page === 1) {
      const subToEdit = subscriptions.value.find(s => s.id === parseInt(props.id!, 10));
      if (subToEdit) {
        openEditModal(subToEdit);
      }
    }
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

const openAddModal = () => {
  selectedSubscription.value = null;
  isModalOpen.value = true;
};

const openEditModal = (sub: Subscription) => {
  selectedSubscription.value = { ...sub };
  isModalOpen.value = true;
};

const closeModal = () => {
  isModalOpen.value = false;
  selectedSubscription.value = null;
  if (props.id) {
    router.push('/subscriptions');
  }
};

const handleCancel = async (id: number) => {
  if (confirm('Are you sure you want to cancel this subscription? It will be moved to history.')) {
    try {
      await api.cancelSubscription(id);
      await fetchSubscriptions();
    } catch (err: any) {
      error.value = err.message;
    }
  }
};

const handleDelete = async (id: number) => {
  if (confirm('Are you sure you want to delete this subscription?')) {
    try {
      await api.deleteSubscription(id);
      await fetchSubscriptions(); // Refresh the list
    } catch (err: any) {
      error.value = err.message;
    }
  }
};

onMounted(fetchSubscriptions);
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
