<template>
    <!--Vuetify container -->
    <v-card class="w-100">
      <v-card-title class="d-flex align-center flex-wrap">
        <v-icon icon="mdi-history" class="mr-2"></v-icon>
        Network Logs
        <v-spacer></v-spacer> <!-- space pushing following items to the right -->
  

        <!-- Button group to choose the sort key-->
        <v-btn-toggle
          v-model="sortKey"
          variant="outlined"
          density="compact"
          divided
          class="mr-2"
        >
          <!-- Sort by date, id and label -
                 link with v-model -->
          <v-btn value="timestamp" size="small">
            <v-icon start icon="mdi-calendar-clock"></v-icon>
            Date
          </v-btn>
          <v-btn value="id" size="small">
            <v-icon start icon="mdi-pound"></v-icon>
            ID
          </v-btn>
          <v-btn value="label" size="small">
            <v-icon start icon="mdi-tag-text-outline"></v-icon>
            Label
          </v-btn>
        </v-btn-toggle>
  

        <v-tooltip location="bottom">
          <!-- the element that shows the tooltip when hovered-->
          <template v-slot:activator="{ props }">
            <!-- button that triggers sorting (with js function)-->
            <v-btn
              v-bind="props"
              @click="toggleSortOrder"
              variant="text"
              :icon="sortOrder === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending'"
            >
            </v-btn>
          </template>

          <span>Sort by order ({{ sortOrder === 'asc' ? 'ascending' : 'descending' }})</span>
        </v-tooltip>
  
      </v-card-title>
  
      <!-- separator horizontal-->
      <v-divider></v-divider>
  
      <!-- alarm history table -->
      <v-table density="compact" class="log-table w-100">
        <thead>
          <tr>
            <th class="text-center" style="width: 200px;">Timestamp</th>
            <th class="text-center" style="width: 150px;">ID</th>
            <th class="text-center">Label </th>
          </tr>
        </thead>
        <tbody>

          <!-- when no alarms are available -->
          <tr v-if="!sortedAlarms.length">
            <td colspan="3" class="text-center py-4 text-grey">
              <v-icon icon="mdi-file-document-outline" size="48" class="mb-2"></v-icon><br>
              No alarms available.
            </td>
          </tr>
  
          <!-- loop through each sorted alarm and display it-->
          <tr v-for="alarm in sortedAlarms" :key="alarm.id">
            <td class="text-caption">{{ formatTimestamp(alarm.timestamp) }}</td>
            <td class="text-caption font-weight-medium">{{ alarm.id }}</td>
            <td class="text-body-2">{{ alarm.signal_label || '—' }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
  </template>
  

  <script setup>
  import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
  import io from 'socket.io-client';
  import expressXClient from '@jcbuisson/express-x-client';

  const socket = io('http://localhost:8080', { transports: ['websocket'] });
  const app = expressXClient(socket);
  
  // reactive states 
  
  const alarms = ref([]);
  const sortKey = ref('timestamp'); // sort alarms depending timestamp, id, label.
  const sortOrder = ref('desc'); // current sort order 
  
  // returns the alarms array based on sortKey + sortOrder
  const sortedAlarms = computed(() => {
    // original 'alarms' never modified 
    // compare two by two : a & b 
    return [...alarms.value].sort((a, b) => {
      let valA, valB;
  

      // extracts the corresponding values depending user's choice
      // what we are going to compare
      switch (sortKey.value) {
        case 'id':
          valA = a.id || ''; // || avoid error if null 
          valB = b.id || '';
          break;
        case 'label':
          valA = a.signal_label || '';
          valB = b.signal_label || '';
          break;
        case 'timestamp':
        default:
          // translation in number
          valA = new Date(a.timestamp).getTime() || 0;
          valB = new Date(b.timestamp).getTime() || 0;
          break;
      }
  
      // by default 
      let comparison = 0;
      if (valA > valB) {
        comparison = 1;
      } else if (valA < valB) {
        comparison = -1;
      }

      // if the user clicks on the tooltip
      // reversal of order with ternary cond.
      return sortOrder.value === 'desc' ? 
        (comparison * -1) 
        : comparison; 
    });
  });
  
  // with @click in the buttun
  function toggleSortOrder() {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  }
  
  // to be easilyreadable
  function formatTimestamp(ts) {
    try {
      return ts ? new Date(ts).toLocaleString() : '—';
    } catch {
      return 'Date invalide';
    }
  }
  
  
  onMounted(() => {

    const staticAlarms = [
      {
        id: 1001,
        timestamp: new Date('2025-10-26T10:30:00Z'),
        signal_label: '[STATIC] High CPU Usage'
      },
      {
        id: 1002,
        timestamp: new Date('2025-10-26T10:32:00Z'),
        signal_label: '[STATIC] Interface eth-0/1 down'
      },
      {
        id: 1003,
        timestamp: new Date('2025-10-26T10:28:00Z'), 
        signal_label: '[STATIC] Memory threshold exceeded'
      }
    ];
    
  
    try {
  
      socket.on('connect', () => {
        console.log('Logs.vue connecté au backend (8080)');
  
        const alarmService = app.service('alarms');
  
        alarmService.findMany({})
          .then(initialAlarms => {
            if (initialAlarms && Array.isArray(initialAlarms)) {
              alarms.value = [...staticAlarms, ... initialAlarms];
              //alarms.value = initialAlarms; 
            } else {
              alarms.value = staticAlarms; // test
            }
          })
          .catch(err => {
            console.warn('Échec de récupération des alarmes initiales:', err.message);
          });
  
          alarmService.on('create', (newAlarm) => {
            if (newAlarm) {
              alarms.value.unshift(newAlarm); 
            }
         });
      });
  
    } catch (error) {
      console.error("Erreur lors de la conf du socket pour les alarmes:", error);
    }
  });
 
  </script>
  
  <style scoped>
  .log-table {
    width: 100%;
    table-layout: fixed;
    min-width: 900px;
  }
  
  td, th {
    word-break: break-word;
  }
  </style>