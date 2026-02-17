<template>
  <div class="modal-backdrop" @click.self="$emit('close')" @keydown.esc="$emit('close')">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header class="modal-header">
        <h2 id="modal-title">{{ isEditMode ? 'Edit' : 'Add' }} Subscription</h2>
        <button @click="$emit('close')" aria-label="Close modal">X</button>
      </header>
      <section class="modal-body">
        <form @submit.prevent="handleSubmit">
          <div>
            <label>Company</label>
            <input v-model="form.company_name" required />
          </div>
          <div>
            <label>Description</label>
            <input v-model="form.description" />
          </div>
          <div>
            <label>Price</label>
            <input type="number" v-model="form.price" required min="0.01" step="0.01" />
          </div>
          <div>
            <label>Subscription Type</label>
            <select v-model="form.subscription_type" required>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="lifetime">Lifetime</option>
            </select>
          </div>
          <div>
            <label>Start Date</label>
            <input type="date" v-model="form.start_date" required />
          </div>
          <p v-if="error" class="error">{{ error }}</p>
          <button type="submit">{{ isEditMode ? 'Save' : 'Create' }}</button>
        </form>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import api from '../services/api';
import type { Subscription, SubscriptionCreate } from '../types';

const props = defineProps<{
  subscription?: Subscription | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'saved'): void;
}>();

const form = ref<Partial<Subscription>>({});
const error = ref('');
const isEditMode = ref(false);

const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    emit('close');
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleEscape);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscape);
});

watch(() => props.subscription, (newVal) => {
  if (newVal) {
    isEditMode.value = true;
    // Format date for input type='date'
    const formattedDate = newVal.start_date ? new Date(newVal.start_date).toISOString().split('T')[0] : '';
    form.value = { ...newVal, start_date: formattedDate, price: newVal.price / 100 };
  } else {
    isEditMode.value = false;
    form.value = { subscription_type: 'monthly' };
  }
}, { immediate: true });


const handleSubmit = async () => {
  error.value = '';
  try {
    const subData = {
      ...form.value,
      price: Math.round(Number(form.value.price) * 100)
    } as SubscriptionCreate;

    if (isEditMode.value && form.value.id) {
      await api.updateSubscription(form.value.id, subData);
    } else {
      await api.createSubscription(subData);
    }
    emit('saved');
    emit('close');
  } catch (err: any) {
    error.value = err.message;
  }
};
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}
.modal {
  background: var(--color-surface);
  padding: 1.5rem;
  border-radius: 8px;
  width: 400px;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-table-border);
  padding-bottom: 1rem;
}
.modal-body {
  padding-top: 1rem;
}
</style>
