<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal">
      <header class="modal-header">
        <h2>{{ isEditMode ? 'Edit' : 'Add' }} Subscription</h2>
        <button @click="$emit('close')">X</button>
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

<script setup>
import { ref, watch, defineProps, defineEmits } from 'vue';
import api from '../services/api';

const props = defineProps({
  subscription: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['close', 'saved']);

const form = ref({});
const error = ref('');
const isEditMode = ref(false);

watch(() => props.subscription, (newVal) => {
  if (newVal) {
    isEditMode.value = true;
    // Format date for input type='date'
    const formattedDate = newVal.start_date ? new Date(newVal.start_date).toISOString().split('T')[0] : '';
    form.value = { ...newVal, start_date: formattedDate };
  } else {
    isEditMode.value = false;
    form.value = { subscription_type: 'monthly' };
  }
}, { immediate: true });


const handleSubmit = async () => {
  error.value = '';
  try {
    if (isEditMode.value) {
      await api.updateSubscription(form.value.id, form.value);
    } else {
      await api.createSubscription(form.value);
    }
    emit('saved');
    emit('close');
  } catch (err) {
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
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  width: 400px;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #ccc;
  padding-bottom: 1rem;
}
.modal-body {
  padding-top: 1rem;
}
form div {
  margin-bottom: 1rem;
}
label {
  display: block;
  margin-bottom: 0.25rem;
}
input, select {
  width: 100%;
  padding: 0.5rem;
}
.error {
  color: red;
}
</style>
