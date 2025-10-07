<template>
  <div>
    <v-row>
      <!-- Quick Stats -->
      <v-col cols="12">
        <v-row>
          <v-col cols="12" md="3">
            <v-card class="mx-auto" variant="outlined">
              <v-card-item>
                <v-card-title class="text-h6">Active Alerts</v-card-title>
                <div class="d-flex align-center">
                  <v-icon icon="mdi-alert" size="x-large" color="error" class="mr-2"></v-icon>
                  <span class="text-h4 font-weight-bold">{{ activeAlerts }}</span>
                </div>
              </v-card-item>
            </v-card>
          </v-col>
          
          <v-col cols="12" md="3">
            <v-card class="mx-auto" variant="outlined">
              <v-card-item>
                <v-card-title class="text-h6">Devices</v-card-title>
                <div class="d-flex align-center">
                  <v-icon icon="mdi-server-network" size="x-large" color="info" class="mr-2"></v-icon>
                  <span class="text-h4 font-weight-bold">2</span>
                </div>
              </v-card-item>
            </v-card>
          </v-col>
          
          <v-col cols="12" md="3">
            <v-card class="mx-auto" variant="outlined">
              <v-card-item>
                <v-card-title class="text-h6">Network Traffic</v-card-title>
                <div class="d-flex align-center">
                  <v-icon icon="mdi-chart-line" size="x-large" color="secondary" class="mr-2"></v-icon>
                  <span class="text-h4 font-weight-bold">120</span>
                  <span class="text-subtitle-1 ml-1">Mbps</span>
                </div>
              </v-card-item>
            </v-card>
          </v-col>
          
          <v-col cols="12" md="3">
            <v-card class="mx-auto" variant="outlined">
              <v-card-item>
                <v-card-title class="text-h6">Mean CPU Usage</v-card-title>
                <div class="d-flex align-center">
                  <v-icon icon="mdi-cpu-64-bit" size="x-large" color="warning" class="mr-2"></v-icon>
                  <span class="text-h4 font-weight-bold">12</span>
                  <span class="text-subtitle-1 ml-1">%</span>
                </div>
              </v-card-item>
            </v-card>
          </v-col>
        </v-row>
      </v-col>

      <v-col cols="12">
        <v-row>
          <!-- Network Topology -->
          <v-col cols="12" lg="8">
            <v-card>
              <v-card-title class="d-flex align-center">
                <v-icon icon="mdi-lan" class="mr-2"></v-icon>
                Network Topology
                <v-spacer></v-spacer>
                <v-chip size="small" color="info" variant="flat">Auto-updates</v-chip>
              </v-card-title>
              <v-card-text class="pa-0">
                <div class="topology-container">
                  <Topology />
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          
          <!-- Alerts Panel -->
          <v-col cols="12" lg="4">
            <v-card>
              <v-card-title class="d-flex align-center">
                <v-icon icon="mdi-alert-circle-outline" class="mr-2"></v-icon>
                Alerts
                <v-spacer></v-spacer>
                <v-chip size="small" color="error" variant="flat">Live</v-chip>
              </v-card-title>
              <v-card-text class="pa-0">
                <AlertsPanel />
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import Topology from './Topology.vue';
import AlertsPanel from './AlertsPanel.vue';
import { ref } from 'vue';

export default {
  name: 'Dashboard',
  components: { Topology, AlertsPanel },
  setup() {
    const activeAlerts = ref(0);
    
    // This would update based on alerts service in a real implementation
    return { 
      activeAlerts
    };
  }
};
</script>

<style>
.topology-container {
  min-height: 400px;
  height: 100%;
}
</style>