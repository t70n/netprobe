<template>
  <v-list class="pa-0">
    <v-list-item
      v-for="service in services"
      :key="service.name"
      class="px-4 py-2"
    >
      <template v-slot:prepend>
        <v-icon
          :color="service.status === 'online' ? 'success' : 'error'"
          class="mr-3"
        >
          {{ service.status === 'online' ? 'mdi-check-circle' : 'mdi-alert-circle' }}
        </v-icon>
      </template>

      <v-list-item-title class="font-weight-medium">
        {{ service.name }}
      </v-list-item-title>

      <template v-slot:append>
        <v-chip
          :color="service.status === 'online' ? 'success' : 'error'"
          size="small"
          variant="flat"
        >
          {{ service.status }}
        </v-chip>
      </template>
    </v-list-item>

    <v-list-item v-if="services.length === 0" class="text-center pa-4">
      <v-list-item-title class="text-grey">
        <v-progress-circular indeterminate color="primary" size="24" class="mr-2"></v-progress-circular>
        Connecting to services...
      </v-list-item-title>
    </v-list-item>
  </v-list>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { io } from 'socket.io-client';
import expressXClient from '@jcbuisson/express-x-client';

const emit = defineEmits(['status-update']);

const services = ref([]);
let socket = null;
let app = null;

// Emit status updates to parent
watch(services, (newServices) => {
  emit('status-update', newServices);
}, { deep: true });

onMounted(() => {
  socket = io({ 
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('AppStatusPanel connected to backend');
    // Add backend as a service
    updateService('Backend API', 'online');
  });

  socket.on('disconnect', () => {
    console.log('AppStatusPanel disconnected from backend');
    updateService('Backend API', 'error');
  });

  socket.on('connect_error', (error) => {
    console.error('AppStatusPanel connection error:', error);
    updateService('Backend API', 'error');
  });

  app = expressXClient(socket);

  // Initialize default services
  services.value = [
    { name: 'Backend API', status: 'online' },
    { name: 'RabbitMQ', status: 'online' },
    { name: 'Producer', status: 'online' },
    { name: 'Consumer', status: 'online' },
  ];

  // Try to get the app-status service for real-time updates
  try {
    const statusService = app.service('app-status');
    
    statusService.findMany({}).then((data) => {
      if (data && Array.isArray(data) && data.length > 0) {
        services.value = data.map(s => ({ name: s.service, status: s.status }));
      }
    }).catch((err) => {
      console.warn('App-status service not yet available:', err);
    });

    statusService.on('create', (data) => {
      console.log('Service status update:', data);
      updateService(data.service, data.status);
    });

  } catch (error) {
    console.warn('App-status service not configured:', error);
  }
});

const updateService = (serviceName, status) => {
  const index = services.value.findIndex(s => s.name === serviceName);
  if (index !== -1) {
    services.value[index].status = status;
  } else {
    services.value.push({ name: serviceName, status });
  }
};

onBeforeUnmount(() => {
  if (socket && socket.connected) {
    socket.disconnect();
  }
});
</script>

<style scoped>
.v-list-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.v-list-item:last-child {
  border-bottom: none;
}
</style>