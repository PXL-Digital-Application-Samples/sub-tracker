<template>
  <div>
    <h1>Active Subscriptions</h1>
    <button @click="openAddModal">Add Subscription</button>
    <div v-if="loading">Loading...</div>
    <div v-if="error">{{ error }}</div>
    <table v-if="subscriptions.length">
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
          <td>${{ sub.price.toFixed(2) }}</td>
          <td>{{ sub.subscription_type }}</td>
          <td>{{ formatDate(sub.start_date) }}</td>
          <td>
            <button @click="openEditModal(sub)">Edit</button>
            <button @click="handleDelete(sub.id)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else>No active subscriptions.</p>

    <SubscriptionModal
      v-if="isModalOpen"
      :subscription="selectedSubscription"
      @close="closeModal"
      @saved="fetchSubscriptions"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, defineProps } from 'vue';
import { useRouter } from 'vue-router';
import api from '../services/api';
import SubscriptionModal from '../components/SubscriptionModal.vue';

const props = defineProps({
  id: {
    type: String,
    default: null,
  },
});

const subscriptions = ref([]);
const loading = ref(true);
const error = ref('');
const isModalOpen = ref(false);
const selectedSubscription = ref(null);
const router = useRouter();

const fetchSubscriptions = async () => {
  try {
    loading.value = true;
    const response = await api.getActiveSubscriptions();
    subscriptions.value = response.subscriptions;

    if (props.id) {
      const subToEdit = subscriptions.value.find(s => s.id === parseInt(props.id, 10));
      if (subToEdit) {
        openEditModal(subToEdit);
      }
    }
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

const openAddModal = () => {
  selectedSubscription.value = null;
  isModalOpen.value = true;
};

const openEditModal = (sub) => {
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

const handleDelete = async (id) => {
  if (confirm('Are you sure you want to delete this subscription?')) {
    try {
      await api.deleteSubscription(id);
      await fetchSubscriptions(); // Refresh the list
    } catch (err) {
      error.value = err.message;
    }
  }
};

const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
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
  border: 1px solid #ccc;
  padding: 0.75rem;
  text-align: left;
}
</style>
