<template>
  <div class="alerts-panel">
    <!-- Live alerts list -->
    <v-list lines="two" class="alerts-list">
      <template v-if="alarms.length">
        <v-list-item
          v-for="alarm in alarms"
          :key="alarm.id"
          :class="severityClass(alarm)"
        >
          <template v-slot:prepend>
            <v-icon :color="getAlarmColor(alarm)" class="mr-3">
              {{ getAlarmIcon(alarm) }}
            </v-icon>
          </template>
          
          <v-list-item-title class="font-weight-bold">
            {{ alarm.signal_label || 'Unknown Alert' }}
          </v-list-item-title>
          
          <v-list-item-subtitle>
            ID: {{ alarm.signal_id }}
          </v-list-item-subtitle>
          
          <template v-slot:append>
            <div class="text-caption text-grey">
              {{ formatTimestamp(alarm.timestamp) }}
            </div>
          </template>
        </v-list-item>
        <v-divider v-if="alarms.length > 1"></v-divider>
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
import { io } from 'socket.io-client';
import expressXClient from '@jcbuisson/express-x-client';

export default {
  name: 'AlertsPanel',
  data() {
    return {
      alarms: [],
      socket: null,
      app: null,
    };
  },
  async mounted() {
    console.log('AlertsPanel mounted');
    
    this.socket = io({ 
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    
    this.socket.on('connect', () => {
      console.log('AlertsPanel: Connected to backend');
    });

    this.socket.on('disconnect', () => {
      console.log('AlertsPanel: Disconnected from backend');
    });

    this.app = expressXClient(this.socket);

    try {
      const alarmService = this.app.service('alarms');
      
      // Fetch initial alarms
      const initialAlarms = await alarmService.findMany({});
      console.log('AlertsPanel: Initial alarms loaded:', initialAlarms);
      
      if (initialAlarms && Array.isArray(initialAlarms)) {
        this.alarms = initialAlarms.map(a => ({
          ...a,
          timestamp: a.timestamp || new Date().toISOString()
        }));
      }

      // Listen for new alarms
      alarmService.on('create', (newAlarm) => {
        console.log('AlertsPanel: New alarm received:', newAlarm);
        this.pushAlert(newAlarm);
      });

      alarmService.on('update', (updatedAlarm) => {
        console.log('AlertsPanel: Alarm updated:', updatedAlarm);
        this.updateAlert(updatedAlarm);
      });

      alarmService.on('delete', (deletedAlarm) => {
        console.log('AlertsPanel: Alarm deleted:', deletedAlarm);
        this.removeAlert(deletedAlarm.id);
      });

    } catch (error) {
      console.error('AlertsPanel: Error setting up alarm service:', error);
    }
  },
  methods: {
    formatTimestamp(ts) {
      if (!ts) return 'Just now';
      try {
        const date = new Date(ts);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000); // seconds
        
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return date.toLocaleString();
      } catch {
        return 'Unknown time';
      }
    },
    
    inferSeverity(alarm) {
      const label = (alarm.signal_label || '').toLowerCase();
      if (label.includes('critical') || label.includes('[critical]')) return 'critical';
      if (label.includes('major') || label.includes('[major]')) return 'major';
      if (label.includes('minor') || label.includes('warning') || label.includes('[warning]')) return 'minor';
      return 'info';
    },
    
    getAlarmIcon(alarm) {
      const severity = this.inferSeverity(alarm);
      const icons = {
        'critical': 'mdi-alert-circle',
        'major': 'mdi-alert',
        'minor': 'mdi-alert-outline',
        'info': 'mdi-information'
      };
      return icons[severity] || 'mdi-information';
    },
    
    getAlarmColor(alarm) {
      const severity = this.inferSeverity(alarm);
      const colors = {
        'critical': 'error',
        'major': 'orange-darken-2',
        'minor': 'warning',
        'info': 'grey'
      };
      return colors[severity] || 'grey';
    },
    
    severityClass(alarm) {
      const severity = this.inferSeverity(alarm);
      return `alert-${severity}`;
    },
    
    pushAlert(alarm) {
      if (!alarm) return;
      
      // Add timestamp if missing
      const normalizedAlarm = {
        ...alarm,
        timestamp: alarm.timestamp || new Date().toISOString()
      };
      
      // Check if alarm already exists
      const existingIndex = this.alarms.findIndex(a => a.id === alarm.id);
      if (existingIndex >= 0) {
        this.alarms[existingIndex] = normalizedAlarm;
      } else {
        this.alarms.unshift(normalizedAlarm);
      }
      
      // Keep only last 200 alarms
      if (this.alarms.length > 200) {
        this.alarms = this.alarms.slice(0, 200);
      }
    },
    
    updateAlert(alarm) {
      const index = this.alarms.findIndex(a => a.id === alarm.id);
      if (index >= 0) {
        this.alarms[index] = {
          ...alarm,
          timestamp: alarm.timestamp || this.alarms[index].timestamp
        };
      }
    },
    
    removeAlert(alarmId) {
      this.alarms = this.alarms.filter(a => a.id !== alarmId);
    }
  },
  
  beforeUnmount() {
    console.log('AlertsPanel: Unmounting');
    if (this.socket && this.socket.connected) {
      this.socket.disconnect();
    }
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
  background-color: rgba(239, 68, 68, 0.05);
}

.alert-major {
  border-left: 4px solid #f97316;
  background-color: rgba(249, 115, 22, 0.05);
}

.alert-minor {
  border-left: 4px solid #facc15;
  background-color: rgba(250, 204, 21, 0.05);
}

.alert-info {
  border-left: 4px solid #94a3b8;
  background-color: rgba(148, 163, 184, 0.05);
}

.v-list-item {
  transition: all 0.2s ease;
}

.v-list-item:hover {
  background-color: rgba(0, 0, 0, 0.02);
}
</style>