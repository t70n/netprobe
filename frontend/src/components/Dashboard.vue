<template>
  <div>
    <v-row>
      <v-col cols="12">
        <v-row>
          <v-col cols="12" md="4">
            <v-card class="mx-auto" variant="outlined">
              <v-card-item>
                <v-card-title class="text-h6">Active Alerts</v-card-title>
                <div class="d-flex align-center">
                  <v-icon icon="mdi-alert-circle" size="x-large" :color="activeAlerts > 0 ? 'error' : 'success'" class="mr-2"></v-icon>
                  <span class="text-h4 font-weight-bold">{{ activeAlerts }}</span>
                </div>
              </v-card-item>
            </v-card>
          </v-col>
          
          <v-col cols="12" md="4">
            <v-card class="mx-auto" variant="outlined">
              <v-card-item>
                <v-card-title class="text-h6">Total Events</v-card-title>
                <div class="d-flex align-center">
                  <v-icon icon="mdi-database" size="x-large" color="info" class="mr-2"></v-icon>
                  <span class="text-h4 font-weight-bold">{{ totalEvents }}</span>
                </div>
              </v-card-item>
            </v-card>
          </v-col>
          
          <v-col cols="12" md="4">
            <v-card class="mx-auto" variant="outlined">
              <v-card-item>
                <v-card-title class="text-h6">Uptime</v-card-title>
                <div class="d-flex align-center">
                  <v-icon icon="mdi-clock-outline" size="x-large" color="primary" class="mr-2"></v-icon>
                  <span class="text-h5 font-weight-bold">{{ uptime }}</span>
                </div>
              </v-card-item>
            </v-card>
          </v-col>
        </v-row>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12">
        <v-card variant="outlined" class="section-card">
          <v-card-title class="section-header">
            <v-icon icon="mdi-network" class="mr-2" color="success"></v-icon>
            <span class="text-h5">Network Infrastructure</span>
          </v-card-title>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" lg="8">
        <v-card class="h-100">
          <v-card-title class="d-flex align-center">
            <v-icon icon="mdi-lan" class="mr-2"></v-icon>
            Monitored Devices
            <v-spacer></v-spacer>
            <v-chip size="small" color="success" variant="flat">
              <v-icon icon="mdi-refresh" size="small" class="mr-1"></v-icon>
              Live Updates
            </v-chip>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-0">
            <div class="topology-container">
              <Topology />
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" lg="4">
        <v-card class="h-100">
          <v-card-title class="d-flex align-center">
            <v-icon icon="mdi-alert-circle-outline" class="mr-2"></v-icon>
            Recent Alerts
            
            <v-tooltip location="top">
              <template v-slot:activator="{ props }">
                <v-btn
                  v-bind="props"
                  size="small"
                  color="error"
                  variant="tonal"
                  icon="mdi-delete-sweep"
                  @click="resetSimulation"
                  class="ml-4"
                ></v-btn>
              </template>
              <span>Reset All Alarms</span>
            </v-tooltip>

            <v-spacer></v-spacer>
            <v-chip size="small" color="error" variant="flat">
              <v-icon icon="mdi-bell-ring" size="small" class="mr-1"></v-icon>
              Live
            </v-chip>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-0">
            <AlertsPanel @alerts-update="handleAlertsUpdate" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>


    <v-row class="mt-6">
      <v-col cols="12">
        <v-card variant="outlined" class="section-card">
          <v-card-title class="section-header">
            <v-icon icon="mdi-application-cog" class="mr-2" color="primary"></v-icon>
            <span class="text-h5">Application Architecture</span>
          </v-card-title>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" lg="12">
        <v-card class="h-100">
          <v-card-title class="d-flex align-center">
            <v-icon icon="mdi-sitemap" class="mr-2"></v-icon>
            System Components
            <v-spacer></v-spacer>
            <v-chip size="small" color="primary" variant="flat">
              <v-icon icon="mdi-pulse" size="small" class="mr-1"></v-icon>
              Live Status
            </v-chip>
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text class="pa-0">
            <div class="architecture-container">
              <ArchitectureDiagram />
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      
      </v-row>
    </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { io } from 'socket.io-client';
import expressXClient from '@jcbuisson/express-x-client';
import Topology from './Topology.vue';
import AlertsPanel from './AlertsPanel.vue';
// ===[ REMOVED ]===
// import AppStatusPanel from './AppStatusPanel.vue';
import ArchitectureDiagram from './ArchitectureDiagram.vue';

export default {
  name: 'Dashboard',
  components: { 
    Topology, 
    AlertsPanel, 
    // AppStatusPanel, // Removed
    ArchitectureDiagram,
  },
  setup() {
    const activeAlerts = ref(0);
    const totalEvents = ref(0);
    // ===[ REMOVED ]===
    // const servicesOnline = ref(0);
    // const totalServices = ref(0);
    const uptime = ref('--:--:--');
    
    let socket = null;
    let app = null;
    let startTime = null;
    let uptimeInterval = null;
    let alarmService = null; 

    const formatUptime = (seconds) => {
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      
      if (days > 0) {
        return `${days}d ${hours}h`;
      } else if (hours > 0) {
        return `${hours}h ${mins}m`;
      } else {
        return `${mins}m ${secs}s`;
      }
    };

    const updateUptime = () => {
      if (startTime) {
        const elapsed = (Date.now() - startTime) / 1000;
        uptime.value = formatUptime(elapsed);
      }
    };

    // ===[ REMOVED ]===
    // const handleStatusUpdate = (services) => {
    //   if (services && Array.isArray(services)) {
    //     totalServices.value = services.length;
    //     servicesOnline.value = services.filter(s => s.status === 'online').length;
    //   }
    // };

    const handleAlertsUpdate = (alerts) => {
      if (alerts && Array.isArray(alerts)) {
        activeAlerts.value = alerts.length;
      }
    };

    const resetSimulation = async () => {
      if (!alarmService) {
        console.error('Alarm service is not yet connected.');
        return;
      }
      if (confirm('Are you sure you want to delete ALL alarms? This cannot be undone.')) {
        try {
          await alarmService.clearAll();
          console.log('All alarms cleared, resetting counters.');
          totalEvents.value = 0;
          activeAlerts.value = 0;
        } catch (error) {
          console.error('Failed to clear alarms:', error);
          alert('Failed to clear alarms. Check the console.');
        }
      }
    };

    onMounted(async () => {
      const storedStartTime = localStorage.getItem('netprobe_start_time');
      if (storedStartTime) {
        startTime = parseInt(storedStartTime, 10);
      } else {
        startTime = Date.now();
        localStorage.setItem('netprobe_start_time', startTime.toString());
      }
      
      uptimeInterval = setInterval(updateUptime, 1000);
      updateUptime();

      socket = io({ 
        transports: ['websocket', 'polling'],
        reconnection: true,
      });

      socket.on('connect', () => {
        console.log('Dashboard connected to backend');
      });

      app = expressXClient(socket);

      try {
        alarmService = app.service('alarms');
        
        const allAlarms = await alarmService.findMany({});
        
        if (allAlarms && Array.isArray(allAlarms)) {
          totalEvents.value = allAlarms.length;
          activeAlerts.value = allAlarms.length;
        }

        alarmService.on('create', () => {
          totalEvents.value++;
          activeAlerts.value++;
        });

      } catch (error) {
        console.warn('Could not fetch alarm stats:', error);
      }
    });

    onBeforeUnmount(() => {
      if (uptimeInterval) {
        clearInterval(uptimeInterval);
      }
      if (socket && socket.connected) {
        socket.disconnect();
      }
    });

    return { 
      activeAlerts,
      totalEvents,
      // servicesOnline, // Removed
      // totalServices, // Removed
      uptime,
      // handleStatusUpdate, // Removed
      handleAlertsUpdate,
      resetSimulation,
    };
  }
};
</script>

<style scoped>
.topology-container {
  min-height: 500px;
  height: 500px;
}

.architecture-container {
  min-height: 450px;
  height: 450px;
}

.section-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.section-header {
  font-weight: 700;
  color: #1a237e;
}

.v-card-title {
  font-weight: 600;
}

.v-chip {
  font-weight: 500;
}
</style>