<template>
  <div class="architecture-wrapper">
    <div ref="diagramDiv" class="diagram-container"></div>
    
    <!-- Enhanced Legend with Controls -->
    <div class="control-panel">
      <v-card variant="flat" class="pa-3">
        <div class="text-subtitle-2 font-weight-bold mb-3">System Controls</div>
        
        <!-- Service Control Buttons -->
        <div class="mb-3">
          <v-btn 
            size="small" 
            :color="serviceStates.producer ? 'error' : 'success'"
            variant="flat"
            @click="toggleService('producer')"
            block
            class="mb-2"
          >
            <v-icon :icon="serviceStates.producer ? 'mdi-stop' : 'mdi-play'" class="mr-1" size="small"></v-icon>
            {{ serviceStates.producer ? 'Stop' : 'Start' }} Producer
          </v-btn>
          
          <v-btn 
            size="small" 
            :color="serviceStates.consumer ? 'error' : 'success'"
            variant="flat"
            @click="toggleService('consumer')"
            block
            class="mb-2"
          >
            <v-icon :icon="serviceStates.consumer ? 'mdi-stop' : 'mdi-play'" class="mr-1" size="small"></v-icon>
            {{ serviceStates.consumer ? 'Stop' : 'Start' }} Consumer
          </v-btn>
          
          <v-btn 
            size="small" 
            color="warning"
            variant="flat"
            @click="degradeService('rabbitmq')"
            block
          >
            <v-icon icon="mdi-alert" class="mr-1" size="small"></v-icon>
            Degrade RabbitMQ
          </v-btn>
        </div>
        
        <v-divider class="my-2"></v-divider>
        
        <!-- Connection Legend -->
        <div class="text-caption font-weight-bold mb-2">Connection Types:</div>
        <div class="d-flex flex-column">
          <div class="d-flex align-center mb-1">
            <div style="width: 24px; height: 3px; background: #2196f3;" class="mr-2"></div>
            <span class="text-caption">WebSocket</span>
          </div>
          <div class="d-flex align-center mb-1">
            <div style="width: 24px; height: 3px; background: #ff9800;" class="mr-2"></div>
            <span class="text-caption">AMQP</span>
          </div>
          <div class="d-flex align-center mb-1">
            <div style="width: 24px; height: 3px; background: #4caf50;" class="mr-2"></div>
            <span class="text-caption">HTTP</span>
          </div>
          <div class="d-flex align-center">
            <div style="width: 24px; height: 3px; background: #00acc1;" class="mr-2"></div>
            <span class="text-caption">Database</span>
          </div>
        </div>
      </v-card>
    </div>
  </div>
</template>

<script>
import * as go from 'gojs';
import { io } from 'socket.io-client';
import expressXClient from '@jcbuisson/express-x-client';

export default {
  name: 'ArchitectureDiagram',
  data() {
    return {
      diagram: null,
      socket: null,
      app: null,
      serviceStates: {
        producer: true,
        consumer: true,
        rabbitmq: true,
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
      const $ = go.GraphObject.make;
      
      this.diagram = $(go.Diagram, div, {
        'undoManager.isEnabled': false,
        initialContentAlignment: go.Spot.Center,
        layout: $(go.Layout),
        'animationManager.isEnabled': true,
      });

      // Node template
      this.diagram.nodeTemplate = $(
        go.Node,
        'Auto',
        {
          locationSpot: go.Spot.Center,
        },
        $(
          go.Shape,
          'RoundedRectangle',
          {
            strokeWidth: 3,
            fill: '#ffffff',
            portId: '',
            fromLinkable: true,
            toLinkable: true,
            cursor: 'pointer',
          },
          new go.Binding('stroke', 'status', (status) => 
            status === 'online' ? '#4caf50' : status === 'degraded' ? '#ff9800' : '#f44336'
          )
        ),
        $(
          go.Panel,
          'Vertical',
          { margin: 16 },
          $(
            go.TextBlock,
            {
              font: 'bold 16px sans-serif',
              margin: new go.Margin(0, 0, 4, 0),
              textAlign: 'center',
            },
            new go.Binding('text', 'name')
          ),
          $(
            go.TextBlock,
            {
              font: '12px sans-serif',
              stroke: '#666',
              textAlign: 'center',
              margin: new go.Margin(0, 0, 8, 0),
            },
            new go.Binding('text', 'type')
          ),
          $(
            go.Panel,
            'Horizontal',
            $(
              go.Shape,
              'Circle',
              { 
                width: 10, 
                height: 10, 
                strokeWidth: 0,
                margin: new go.Margin(0, 6, 0, 0),
              },
              new go.Binding('fill', 'status', (status) => 
                status === 'online' ? '#4caf50' : status === 'degraded' ? '#ff9800' : '#f44336'
              )
            ),
            $(
              go.TextBlock,
              {
                font: 'bold 12px sans-serif',
              },
              new go.Binding('text', 'status', (status) => 
                status === 'online' ? 'Online' : status === 'degraded' ? 'Degraded' : 'Offline'
              ),
              new go.Binding('stroke', 'status', (status) => 
                status === 'online' ? '#4caf50' : status === 'degraded' ? '#ff9800' : '#f44336'
              )
            )
          )
        )
      );

      // Link template - NO LABELS, only colored lines
      this.diagram.linkTemplate = $(
        go.Link,
        {
          routing: go.Link.Orthogonal,
          corner: 10,
          selectable: false,
        },
        $(
          go.Shape,
          { 
            strokeWidth: 3,
          },
          new go.Binding('stroke', 'protocol', this.getProtocolColor)
        ),
        $(
          go.Shape,
          { 
            toArrow: 'Standard',
            strokeWidth: 0,
            scale: 1.3,
          },
          new go.Binding('fill', 'protocol', this.getProtocolColor)
        )
      );

      // Create the model with manual positioning
      const nodeDataArray = [
        { 
          key: 'frontend', 
          name: 'Frontend', 
          type: 'Vue.js + Vite',
          status: 'online',
          loc: '0 0'
        },
        { 
          key: 'backend', 
          name: 'Backend API', 
          type: 'Node.js + Express',
          status: 'online',
          loc: '-100 150'
        },
        { 
          key: 'rabbitmq', 
          name: 'RabbitMQ', 
          type: 'Message Broker',
          status: 'online',
          loc: '100 150'
        },
        { 
          key: 'database', 
          name: 'Database', 
          type: 'SQLite + Prisma',
          status: 'online',
          loc: '-100 300'
        },
        { 
          key: 'producer', 
          name: 'Telemetry Producer', 
          type: 'Python Simulator',
          status: 'online',
          loc: '100 300'
        },
        { 
          key: 'consumer', 
          name: 'Alarm Processor', 
          type: 'Node.js Worker',
          status: 'online',
          loc: '250 300'
        },
      ];

      const linkDataArray = [
        { from: 'frontend', to: 'backend', protocol: 'WebSocket' },
        { from: 'backend', to: 'database', protocol: 'Prisma' },
        { from: 'backend', to: 'rabbitmq', protocol: 'AMQP' },
        { from: 'producer', to: 'rabbitmq', protocol: 'AMQP' },
        { from: 'rabbitmq', to: 'consumer', protocol: 'AMQP' },
        { from: 'consumer', to: 'backend', protocol: 'HTTP' },
      ];

      this.diagram.model = new go.GraphLinksModel(nodeDataArray, linkDataArray);
    },

    getProtocolColor(protocol) {
      const colors = {
        'WebSocket': '#2196f3',
        'HTTP': '#4caf50',
        'AMQP': '#ff9800',
        'Prisma': '#00acc1',
      };
      return colors[protocol] || '#757575';
    },

    toggleService(service) {
      this.serviceStates[service] = !this.serviceStates[service];
      const newStatus = this.serviceStates[service] ? 'online' : 'offline';
      
      // Update the diagram
      this.updateNodeStatus(service, newStatus);
      
      // TODO: Send command to backend to actually stop/start the service
      console.log(`${service} toggled to ${newStatus}`);
      
      // Simulate backend call
      try {
        fetch('/api/service-control', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service, action: newStatus })
        }).catch(err => console.warn('Service control endpoint not implemented:', err));
      } catch (err) {
        console.warn('Could not control service:', err);
      }
    },

    degradeService(service) {
      this.updateNodeStatus(service, 'degraded');
      
      console.log(`${service} degraded`);
      
      // Auto-recover after 5 seconds (demo)
      setTimeout(() => {
        this.updateNodeStatus(service, 'online');
      }, 5000);
    },

    setupSocketConnection() {
      this.socket = io({ 
        transports: ['websocket', 'polling'],
        reconnection: true,
      });

      this.socket.on('connect', () => {
        console.log('ArchitectureDiagram connected to backend');
        this.updateNodeStatus('backend', 'online');
        this.updateNodeStatus('frontend', 'online');
      });

      this.socket.on('disconnect', () => {
        this.updateNodeStatus('backend', 'offline');
      });

      this.app = expressXClient(this.socket);

      // Listen for service status updates
      try {
        const statusService = this.app.service('app-status');
        
        statusService.on('create', (data) => {
          const serviceMap = {
            'Backend API': 'backend',
            'RabbitMQ': 'rabbitmq',
            'Producer': 'producer',
            'Consumer': 'consumer',
          };
          
          const nodeKey = serviceMap[data.service];
          if (nodeKey) {
            this.updateNodeStatus(nodeKey, data.status);
            this.serviceStates[nodeKey] = data.status === 'online';
          }
        });

        statusService.findMany({}).then((services) => {
          services.forEach(service => {
            const serviceMap = {
              'Backend API': 'backend',
              'RabbitMQ': 'rabbitmq',
              'Producer': 'producer',
              'Consumer': 'consumer',
            };
            const nodeKey = serviceMap[service.service];
            if (nodeKey) {
              this.updateNodeStatus(nodeKey, service.status);
              this.serviceStates[nodeKey] = service.status === 'online';
            }
          });
        }).catch(() => {
          ['backend', 'rabbitmq', 'producer', 'consumer', 'database'].forEach(key => {
            this.updateNodeStatus(key, 'online');
          });
        });

      } catch (error) {
        console.warn('App-status service not available');
      }
    },

    updateNodeStatus(nodeKey, status) {
      if (!this.diagram) return;
      
      const node = this.diagram.findNodeForKey(nodeKey);
      if (!node) return;

      this.diagram.model.startTransaction('status');
      this.diagram.model.setDataProperty(node.data, 'status', status);
      this.diagram.model.commitTransaction('status');
    },
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
.architecture-wrapper {
  position: relative;
  height: 100%;
  width: 100%;
  min-height: 450px;
}

.diagram-container {
  width: 100%;
  height: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: linear-gradient(to bottom, #fafafa 0%, #f5f5f5 100%);
}

.control-panel {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 100;
  background-color: rgba(255, 255, 255, 0.98);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.15);
  max-width: 200px;
}
</style>