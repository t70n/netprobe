<template>
  <v-list dense>
    <v-list-item
      v-for="service in services"
      :key="service.name"
    >
      <v-list-item-title class="font-weight-medium">{{ service.name }}</v-list-item-title>
      
      <template v-slot:prepend>
        <v-icon :color="getStatusColor(service.status)" icon="mdi-circle" size="small" class="mr-3"></v-icon>
      </template>

      <template v-slot:append>
        <div class="d-flex align-center">
          <v-chip
            :color="getStatusColor(service.status)"
            size="small"
            variant="tonal"
            class="text-uppercase font-weight-bold"
          >
            {{ service.status }}
          </v-chip>

          <template v-if="service.name.toLowerCase() === 'consumer'">
            <v-btn
              size="small"
              variant="text"
              icon="mdi-play"
              color="success"
              :disabled="service.status === 'online'"
              @click="controlService(service.name, 'start')"
              class="ml-2"
            ></v-btn>
            <v-btn
              size="small"
              variant="text"
              icon="mdi-stop"
              color="error"
              :disabled="service.status !== 'online'"
              @click="controlService(service.name, 'stop')"
            ></v-btn>
          </template>
        </div>
      </template>
    </v-list-item>
  </v-list>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { io } from 'socket.io-client';
import expressXClient from '@jcbuisson/express-x-client';
import axios from 'axios'; // We need axios to call the new API

export default {
  name: 'AppStatusPanel',
  emits: ['status-update'],
  setup(props, { emit }) {
    const services = ref([]);
    let socket = null;
    let app = null;
    let appStatusService = null;

    const getStatusColor = (status) => {
      switch (status) {
        case 'online': return 'success';
        case 'offline': return 'grey';
        case 'error': return 'error';
        default: return 'warning';
      }
    };

    const updateStatuses = (statusArray) => {
      if (statusArray && Array.isArray(statusArray)) {
        services.value = statusArray.sort((a, b) => a.name.localeCompare(b.name));
        emit('status-update', services.value);
      }
    };

    // ---[ MODIFIED FUNCTION ]---
    const controlService = async (serviceName, action) => {
      console.log(`Requesting ${action} for ${serviceName}`);
      try {
        // Send request to the new /api/service-control endpoint
        // This request goes to Vite, which proxies it to the backend (port 8080)
        const response = await axios.post('/api/service-control', {
          service: serviceName.toLowerCase(),
          action: action
        });
        console.log('Control request successful:', response.data);
        // Note: The status will update automatically via the WebSocket push
      } catch (error) {
        console.error(`Failed to ${action} service:`, error);
        alert(`Failed to ${action} ${serviceName}. See console for details.`);
      }
    };
    // ---[ END MODIFIED FUNCTION ]---

    onMounted(async () => {
      socket = io({ transports: ['websocket', 'polling'], reconnection: true });

      socket.on('connect', () => {
        console.log('AppStatusPanel connected to backend');
      });

      app = expressXClient(socket);
      appStatusService = app.service('app_status');

      try {
        const initialStatuses = await appStatusService.findMany({});
        updateStatuses(initialStatuses);
      } catch (error) {
        console.warn('Could not fetch initial app statuses:', error);
      }

      appStatusService.on('data', (data) => {
        updateStatuses(data);
      });
    });

    onBeforeUnmount(() => {
      if (appStatusService) {
        appStatusService.off('data');
      }
      if (socket && socket.connected) {
        socket.disconnect();
      }
    });

    return {
      services,
      getStatusColor,
      controlService,
    };
  }
};
</script>