<template>
  <v-app>
    <!-- App Bar -->
    <v-app-bar color="primary" density="default">
      <v-app-bar-title class="text-white">
        <div class="d-flex align-center">
          <v-icon icon="mdi-lan-connect" class="mr-2"></v-icon>
          NetProbe
        </div>
      </v-app-bar-title>

      <v-spacer></v-spacer>

      <div class="d-flex align-center text-white text-subtitle-2 mr-4">
        <v-icon icon="mdi-circle" color="success" size="small" class="mr-1"></v-icon>
        Connected to backend:8000
      </div>
      
      <v-btn icon>
        <v-icon>mdi-cog-outline</v-icon>
      </v-btn>
    </v-app-bar>

    <!-- Main Content -->
    <v-main class="bg-grey-lighten-4">
      <v-container fluid class="pa-4">
        <Dashboard />
      </v-container>
    </v-main>

    <!-- Footer -->
    <v-footer app class="pa-3 text-center">
      <div class="text-caption text-grey">NetProbe Monitoring Tool</div>
    </v-footer>
  </v-app>
</template>

<script>
import Dashboard from './components/Dashboard.vue';

export default {
  name: 'App',
  components: { Dashboard }
};
</script>