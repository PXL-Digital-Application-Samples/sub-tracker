import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { setUnauthorizedHandler, initCsrf } from './services/api'
import { useAuthStore } from './stores/auth'

const app = createApp(App)

app.use(createPinia())
app.use(router)

const authStore = useAuthStore();

setUnauthorizedHandler(() => {
  authStore.logout();
  router.push('/login');
});

initCsrf();

app.mount('#app')
