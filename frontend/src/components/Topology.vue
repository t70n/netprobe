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

export default {
  name: 'Topology',
  data() {
    return {
      diagram: null,
      socket: null,
      appClient: null,
      deviceIcons: {
        Router: {
          url: "/img/router-svgrepo-com.svg"
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
    initializeDiagram(div) {
      this.diagram = createDiagram(div);
      
      const $ = go.GraphObject.make;
      this.diagram.nodeTemplate = createNodeTemplate($, this.deviceIcons);
      this.diagram.linkTemplate = createLinkTemplate($);
      
      const { nodes, links } = getInitialNetworkData();
      this.diagram.model = new go.GraphLinksModel(nodes, links);
      
      positionNodes(this.diagram);
    },
    
    setupSocketConnection() {
      try {
        this.socket = io({ 
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });
        
        this.socket.on('connect', () => {
          console.log('Topology connected to backend');
        });
        
        this.socket.on('connect_error', (error) => {
          console.error('Topology connection error:', error);
        });
        
        this.appClient = expressXClient(this.socket);
        this.setupAlertHandler();
      } catch (err) {
        console.warn('Socket connection failed:', err);
      }
    },
    
    setupAlertHandler() {
      const updateNodeFromAlerte = (alerte) => {
        if (!alerte || !alerte.device || !this.diagram) return;
        
        const node = this.diagram.findNodeForKey(alerte.device);
        if (!node) return;
        
        const newColor = getSeverityColor(alerte.severity);
        
        // Animate the alert with a pulse effect
        this.diagram.model.startTransaction('alert');
        this.diagram.model.setDataProperty(node.data, "color", newColor);
        
        // Add a temporary pulse animation by changing scale
        const originalScale = node.scale;
        node.scale = 1.2;
        
        setTimeout(() => {
          if (this.diagram && node) {
            node.scale = originalScale;
          }
        }, 300);
        
        this.diagram.model.commitTransaction('alert');
        
        // Flash the node border
        this.flashNode(node);
      };

      try {
        const svc = this.appClient.service('alarms');
        if (svc && typeof svc.on === 'function') {
          svc.on('create', updateNodeFromAlerte);
          console.log('Topology listening to alarm service');
        } else {
          this.socket.on('nouvelle_alerte', updateNodeFromAlerte);
        }
      } catch (e) {
        console.warn('Could not set up alarm service, using fallback:', e);
        this.socket.on('nouvelle_alerte', updateNodeFromAlerte);
      }
    },
    
    flashNode(node) {
      // Create a flash effect by temporarily changing the stroke
      const shape = node.findObject('SHAPE');
      if (!shape) return;
      
      const originalStrokeWidth = shape.strokeWidth;
      shape.strokeWidth = 6;
      
      setTimeout(() => {
        if (shape) {
          shape.strokeWidth = originalStrokeWidth;
        }
      }, 500);
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