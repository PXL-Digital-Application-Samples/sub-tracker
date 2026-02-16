import { createRouter, createWebHistory } from 'vue-router'
import LoginPage from '../views/LoginPage.vue'
import DashboardPage from '../views/DashboardPage.vue'
import SubscriptionsPage from '../views/SubscriptionsPage.vue'
import HistoryPage from '../views/HistoryPage.vue'
import ProfilePage from '../views/ProfilePage.vue'
import ChangePasswordPage from '../views/ChangePasswordPage.vue'

// A simple auth check. In a real app, this would be more robust.
const isAuthenticated = () => {
  return !!localStorage.getItem('isLoggedIn');
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
    },
    {
      path: '/',
      name: 'dashboard',
      component: DashboardPage,
      meta: { requiresAuth: true },
    },
    {
      path: '/subscriptions',
      name: 'subscriptions',
      component: SubscriptionsPage,
      meta: { requiresAuth: true },
    },
    {
      path: '/subscriptions/history',
      name: 'history',
      component: HistoryPage,
      meta: { requiresAuth: true },
    },
    {
      path: '/subscriptions/:id/edit',
      name: 'edit-subscription',
      component: SubscriptionsPage,
      meta: { requiresAuth: true },
      props: true,
    },
    {
      path: '/profile',
      name: 'profile',
      component: ProfilePage,
      meta: { requiresAuth: true },
    },
    {
      path: '/profile/password',
      name: 'change-password',
      component: ChangePasswordPage,
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach((to, from, next) => {
  if (to.matched.some(record => record.meta.requiresAuth) && !isAuthenticated()) {
    next({ name: 'login' });
  } else {
    next();
  }
});

export default router
