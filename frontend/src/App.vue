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

      <!-- Links -->
      <v-btn to="/" class="text-white">
        <v-icon start icon="mdi-view-dashboard"></v-icon>
        Dashboard
      </v-btn>
      <v-btn to="/logs" class="text-white">
        <v-icon start icon="mdi-console-line"></v-icon>
        Network Logs
      </v-btn>
      <v-btn href="http://localhost:15672" target="_blank" class="text-white">
        <v-icon start icon="mdi-rabbit"></v-icon>
        RabbitMQ
      </v-btn>

      <v-spacer></v-spacer>

      <div class="d-flex align-center text-white text-subtitle-2 mr-4">
        <v-icon icon="mdi-circle" color="success" size="small" class="mr-1"></v-icon>
        Connected to backend:8080
      </div>
      
      <v-btn icon>
        <v-icon>mdi-cog-outline</v-icon>
      </v-btn>
    </v-app-bar>

    <!-- Main Content -->
    <v-main class="bg-grey-lighten-4">
      <v-container fluid class="pa-4">
        <router-view />
      </v-container>
    </v-main>

    <!-- Footer -->
    <v-footer app class="pa-3 text-center">
      <div class="text-caption text-grey">NetProbe Monitoring Tool</div>
    </v-footer>
  </v-app>
</template>

<script>

export default {
  name: 'App',
};
</script>