<template>
  <div class="alerts-panel">
    <!-- Live alerts list -->
    <v-list lines="two" class="alerts-list">
      <template v-if="alertes.length">
        <v-list-item
          v-for="alert in alertes"
          :key="alert.id"
          :class="severityClass(alert.severity)"
        >
          <template v-slot:prepend>
            <v-avatar :color="severityColor(alert.severity)" size="36">
              <v-icon icon="mdi-alert" color="white"></v-icon>
            </v-avatar>
          </template>
          
          <v-list-item-title class="font-weight-medium">
            {{ alert.signal_label || 'Alert' }}
          </v-list-item-title>
          
          <v-list-item-subtitle>
            {{ alert.device || '—' }} • {{ alert.interface || '—' }} • {{ alert.metric_value ?? '—' }}
          </v-list-item-subtitle>
          
          <template v-slot:append>
            <v-chip
              size="small"
              :color="severityColor(alert.severity)"
              variant="tonal"
              class="text-capitalize"
            >
              {{ alert.severity || 'info' }}
            </v-chip>
            <div class="text-caption text-grey mt-1">{{ formatTimestamp(alert.timestamp) }}</div>
          </template>
        </v-list-item>
        <v-divider v-if="alertes.length > 1"></v-divider>
      </template>

      <div v-else class="d-flex flex-column align-center justify-center pa-8">
        <v-icon icon="mdi-bell-off-outline" size="64" color="grey-lighten-1" class="mb-4"></v-icon>
        <span class="text-subtitle-1 text-grey-darken-1">No alerts at this time</span>
        <span class="text-caption text-grey mt-2">Alerts will appear here in real-time</span>
      </div>
    </v-list>
  </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import io from 'socket.io-client';
import expressXClient from '@jcbuisson/express-x-client';

export default {
  name: 'AlertsPanel',
  setup() {
    const alertes = ref([]);
    const socket = io('http://localhost:8080', { transports: ['websocket'] });
    const app = expressXClient(socket);

    function formatTimestamp(ts) {
      try {
        return ts ? new Date(ts).toLocaleString() : '';
      } catch {
        return '';
      }
    }

    function severityClass(sev) {
      if (sev === 'critical') return 'alert-critical';
      if (sev === 'major') return 'alert-major';
      if (sev === 'minor') return 'alert-minor';
      return 'alert-info';
    }
    
    function severityColor(sev) {
      if (sev === 'critical') return 'error';
      if (sev === 'major') return 'orange-darken-2';
      if (sev === 'minor') return 'warning';
      return 'grey';
    }

    const pushAlert = (a) => {
      if (!a) return;
      alertes.value.unshift(a);
      if (alertes.value.length > 200) alertes.value.pop();
    };

    onMounted(async () => {
      socket.on('connect', () => console.log('AlertsPanel connected to backend (8000)'));

      // Fetch initial alerts from backend
      try {
        // Try to get data from alarm service
        const initialAlarms = await app.service('alarm').findMany({});
        console.log('Initial Alarms:', initialAlarms);
        
        if (initialAlarms && Array.isArray(initialAlarms)) {
          alertes.value = initialAlarms;
        }

        // Use 'create' event (not 'created')
        app.service('alarm').on('create', (alarm) => {
          console.log('New Alarm Created:', alarm);
          pushAlert(alarm);
        });

      } catch (error) {
        console.warn('Error with alarm service:', error);
        
        // Fallback: try alertes service
        try {
          const svc = app.service('alertes');
          if (svc && typeof svc.on === 'function') {
            svc.on('create', (a) => pushAlert(a));
            svc.on('update', (a) => pushAlert(a));
          } else {
            socket.on('nouvelle_alerte', (a) => pushAlert(a));
          }
        } catch (e) {
          console.warn('Service approach failed, using socket events');
          socket.on('nouvelle_alerte', (a) => pushAlert(a));
        }
        
        // Add some demo alerts for testing UI
        setTimeout(() => {
          pushAlert({
            id: 'test1',
            severity: 'critical',
            device: 'R1',
            interface: 'eth0',
            signal_label: '[Fake]High CPU Usage',
            metric_value: '98%',
            timestamp: new Date()
          });
          
          setTimeout(() => {
            pushAlert({
              id: 'test2',
              severity: 'minor',
              device: 'S1',
              interface: 'eth2',
              signal_label: '[Fake]Packet Loss',
              metric_value: '2%',
              timestamp: new Date()
            });
          }, 2000);
        }, 1000);
      }
    });
    return { alertes, formatTimestamp, severityClass, severityColor };
  }
};
</script>

<style scoped>
.alerts-panel {
  height: 450px;
}

.alerts-list {
  height: 100%;
  overflow-y: auto;
}

.alert-critical {
  border-left: 4px solid #ef4444;
}

.alert-major {
  border-left: 4px solid #f97316;
}

.alert-minor {
  border-left: 4px solid #facc15;
}

.alert-info {
  border-left: 4px solid #94a3b8;
}
</style>