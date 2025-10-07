<template>
  <div class="topology-wrapper">
    <div ref="diagramDiv" class="diagram-container"></div>
    
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
    
    <div class="title-panel">
      <v-card variant="flat" class="px-4 py-2">
        <h3 class="text-h6">Active topology</h3>
      </v-card>
    </div>
  </div>
</template>

<script>
import * as go from 'gojs';
import io from 'socket.io-client';
import expressXClient from '@jcbuisson/express-x-client';

export default {
  name: 'Topology',
  data() {
    return {
      diagram: null,
      socket: null,
      appClient: null,
      deviceIcons: {
        Router: {
          url: "https://www.svgrepo.com/download/474393/router.svg"
        }
      }
    };
  },  
  
  mounted() {
    const diagramDiv = this.$refs.diagramDiv;
    if (diagramDiv) {
      this.createDiagram(diagramDiv);
    }
    this.setupSocketConnection();
  },
  
  methods: {
    createDiagram(div) {
      const $ = go.GraphObject.make;
      
      this.diagram = $(go.Diagram, div, {
        "undoManager.isEnabled": true,
        padding: 50,
        initialContentAlignment: go.Spot.Center
      });

      this.diagram.nodeTemplate = $(go.Node, "Auto", 
        { 
          locationSpot: go.Spot.Center,
          selectionObjectName: "PANEL"
        },
        $(go.Panel, "Vertical",
          {
            name: "PANEL",
            alignment: go.Spot.Center,
            width: 100,
            height: 120
          },
          // Title above icon
          $(go.TextBlock, 
            { 
              margin: new go.Margin(0, 0, 5, 0),
              font: "bold 14px sans-serif",
              stroke: "#333",
              alignment: go.Spot.Center
            },
            new go.Binding("text", "title")
          ),
          // Router icon
          $(go.Picture, 
            { 
              name: "ICON",
              width: 80,
              height: 80,
              imageStretch: go.GraphObject.Uniform,
              alignment: go.Spot.Center,
              margin: new go.Margin(0, 10, 0, 10)
            },
            new go.Binding("source", "type", (t) => {
              if (t === "Router" && this.deviceIcons[t]) {
                return this.deviceIcons[t].url;
              }
              return "";
            })
          ),
          // Invisible hit area
          $(go.Shape, "Rectangle",
            { 
              fill: "transparent",
              stroke: null,
              width: 80, 
              height: 80,
              alignment: go.Spot.Center,
              position: new go.Point(0, 0)
            }
          ),
          // Status overlay
          $(go.Shape, "Rectangle", 
            { 
              width: 80,
              height: 80,
              stroke: null,
              fill: "rgba(0,0,0,0)",
              alignment: go.Spot.Center,
              position: new go.Point(0, 0)
            },
            new go.Binding("fill", "color", (c) => {
              if (c === "lightblue") return "rgba(0,0,0,0)";
              if (c === "#ef4444") return "rgba(239,68,68,0.3)";
              if (c === "#f97316") return "rgba(249,115,22,0.3)";
              if (c === "#facc15") return "rgba(250,204,21,0.3)";
              return "rgba(0,0,0,0)";
            })
          ),
          // Label below
          $(go.TextBlock, 
            { 
              margin: new go.Margin(5, 0, 0, 0),
              font: "12px sans-serif",
              stroke: "#555",
              alignment: go.Spot.Center
            },
            new go.Binding("text", "label")
          )
        )
      );
      
      this.diagram.linkTemplate = $(go.Link, 
        { 
          routing: go.Link.AvoidsNodes,
          curve: go.Link.JumpOver,
          corner: 10
        },
        $(go.Shape, { strokeWidth: 3, stroke: "#2563eb" }),
        $(go.Shape, { toArrow: "Standard", fill: "#2563eb", stroke: null })
      );

      const nodeData = [
        { key: "R1", title: "Router 1", label: "192.168.1.1", type: "Router", color: "lightblue" },
        { key: "R2", title: "Router 2", label: "192.168.1.2", type: "Router", color: "lightblue" }
      ];
      
      const linkData = [
        { from: "R1", to: "R2" }
      ];

      this.diagram.model = new go.GraphLinksModel(nodeData, linkData);
      
      this.diagram.commit(d => {
        const r1 = d.findNodeForKey("R1");
        const r2 = d.findNodeForKey("R2");
        
        if (r1) r1.location = new go.Point(150, 200);
        if (r2) r2.location = new go.Point(350, 200);
      });
    },
    
    setupSocketConnection() {
      try {
        this.socket = io('http://localhost:8000', { transports: ['websocket'] });
        this.appClient = expressXClient(this.socket);

        this.socket.on('connect', () => console.log('Topology connected'));

        const updateNodeFromAlerte = (alerte) => {
          if (!alerte || !alerte.device || !this.diagram) return;
          
          const node = this.diagram.findNodeForKey(alerte.device);
          if (!node) return;
          
          const colorMap = {
            'critical': '#ef4444',
            'major': '#f97316',
            'minor': '#facc15',
            'info': 'lightblue'
          };
          
          const newColor = colorMap[alerte.severity] || 'lightblue';
          
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
      } catch (err) {
        console.warn('Socket connection failed:', err);
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