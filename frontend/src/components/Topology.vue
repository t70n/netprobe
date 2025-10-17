<template>
  <div class="topology-wrapper">
    <!-- Diagram container where GoJS will render the network topology -->
    <div ref="diagramDiv" class="diagram-container"></div>
    
    <!-- Status indicator legend -->
    <div class="legend-panel">
      <v-card variant="flat" density="compact" class="py-1">
        <v-card-text class="pa-2">
          <div class="d-flex flex-column">
            <div class="d-flex align-center mb-1">
              <v-avatar size="10" color="light-green" class="mr-2"></v-avatar>
              <span class="text-caption">OK</span>
            </div>
            <div class="d-flex align-center mb-1">
              <v-avatar size="10" color="amber-darken-1" class="mr-2"></v-avatar>
              <span class="text-caption">Warning</span>
            </div>
            <div class="d-flex align-center mb-1">
              <v-avatar size="10" color="orange-darken-1" class="mr-2"></v-avatar>
              <span class="text-caption">Major</span>
            </div>
            <div class="d-flex align-center">
              <v-avatar size="10" color="red-darken-1" class="mr-2"></v-avatar>
              <span class="text-caption">Critical</span>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>
    
    <!-- Topology title card -->
    <div class="title-panel">
      <v-card variant="flat" class="px-4 py-2">
        <h3 class="text-h6">Network Topology</h3>
      </v-card>
    </div>
  </div>
</template>

<script>
import * as go from 'gojs';
import io from 'socket.io-client';
import expressXClient from '@jcbuisson/express-x-client';
import { 
  createDiagram, 
  createNodeTemplate, 
  createLinkTemplate,
  getInitialNetworkData, 
  positionNodes,
  getSeverityColor 
} from '../utils/topology';

/**
 * Network Topology Component
 * 
 * This component visualizes network devices and their connections
 * using the GoJS library. It connects to a backend WebSocket to
 * receive real-time status updates.
 */
export default {
  name: 'Topology',
  data() {
    return {
      diagram: null,
      socket: null,
      appClient: null,
      deviceIcons: {
        Router: {
          url: "/img/catrouter.jpg"
        }
      }
    };
  },  
  
  mounted() {
    const diagramDiv = this.$refs.diagramDiv;
    if (diagramDiv) {
      this.initializeDiagram(diagramDiv);
    }
    this.setupSocketConnection();
  },
  
  methods: {
    /**
     * Initializes the GoJS diagram for network topology
     * @param {HTMLElement} div - Container for the diagram
     */
    initializeDiagram(div) {
      // Create the base diagram
      this.diagram = createDiagram(div);
      
      // Set up templates
      const $ = go.GraphObject.make;
      this.diagram.nodeTemplate = createNodeTemplate($, this.deviceIcons);
      this.diagram.linkTemplate = createLinkTemplate($);
      
      // Create the network model
      const { nodes, links } = getInitialNetworkData();
      this.diagram.model = new go.GraphLinksModel(nodes, links);
      
      // Position the nodes
      positionNodes(this.diagram);
    },
    
    /**
     * Sets up the WebSocket connection for real-time updates
     */
    setupSocketConnection() {
      try {
        this.socket = io('http://localhost:8000', { transports: ['websocket'] });
        this.appClient = expressXClient(this.socket);

        this.socket.on('connect', () => console.log('Topology connected to backend'));

        this.setupAlertHandler();
      } catch (err) {
        console.warn('Socket connection failed:', err);
      }
    },
    
    /**
     * Sets up event handlers for incoming alerts
     */
    setupAlertHandler() {
      const updateNodeFromAlerte = (alerte) => {
        if (!alerte || !alerte.device || !this.diagram) return;
        
        const node = this.diagram.findNodeForKey(alerte.device);
        if (!node) return;
        
        const newColor = getSeverityColor(alerte.severity);
        
        this.diagram.model.startTransaction('color');
        this.diagram.model.setDataProperty(node.data, "color", newColor);
        this.diagram.model.commitTransaction('color');
      };

      try {
        const svc = this.appClient.service('alarm');
        if (svc && typeof svc.on === 'function') {
          svc.on('create', updateNodeFromAlerte);
        } else {
          this.socket.on('nouvelle_alerte', updateNodeFromAlerte);
        }
      } catch (e) {
        this.socket.on('nouvelle_alerte', updateNodeFromAlerte);
      }
    }
  },
  
  beforeUnmount() {
    if (this.socket && this.socket.connected) {
      this.socket.disconnect();
    }
    
    if (this.diagram) {
      this.diagram.div = null;
    }
  }
};
</script>

<style scoped>
.topology-wrapper {
  position: relative;
  height: 450px;
  width: 100%;
}

.diagram-container {
  width: 100%;
  height: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background-color: #f6f7fb;
}

.legend-panel {
  position: absolute;
  bottom: 10px;
  right: 10px;
  z-index: 100;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 6px;
}

.title-panel {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 100;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 6px;
}
</style>