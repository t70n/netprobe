import { createRouter, createWebHistory } from 'vue-router';

import Dashboard from '../components/Dashboard.vue';
import Logs from '../components/Logs.vue';

const routes = [
    {
       path: '/',
       name: 'Dashboard',
       component: Dashboard,
    },
    {
       path: '/logs',
       name: 'Logs',
       component: Logs,
    },
 ]
 
 const router = createRouter({
    history: createWebHistory('/'),
    routes
 })
 
 export default router