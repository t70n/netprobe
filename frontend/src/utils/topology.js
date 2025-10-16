import * as go from 'gojs';

/**
 * Network Topology Utilities
 * 
 * Functions for creating and configuring GoJS diagrams.
 */

/**
 * Creates a base diagram with standard configuration
 * @param {HTMLElement} div - The DOM element to contain the diagram
 * @returns {go.Diagram} The configured diagram instance
 */
export function createDiagram(div) {
  const $ = go.GraphObject.make;
  
  return $(go.Diagram, div, {
    "undoManager.isEnabled": true,
    padding: 50,
    initialContentAlignment: go.Spot.Center
  });
}

/**
 * Creates the node template for network devices
 * @param {Function} $ - GoJS object factory function
 * @param {Object} deviceIcons - Map of device types to icon URLs
 * @returns {go.Node} The configured node template
 */
export function createNodeTemplate($, deviceIcons) {
  return $(go.Node, "Auto", { 
    locationSpot: go.Spot.Center,
    selectionObjectName: "PANEL"
  },
  $(go.Panel, "Vertical", {
      name: "PANEL",
      alignment: go.Spot.Center,
      width: 100,
      height: 120
    },
    // Title above icon
    $(go.TextBlock, { 
      margin: new go.Margin(0, 0, 5, 0),
      font: "bold 14px sans-serif",
      stroke: "#333",
      alignment: go.Spot.Center
    }, new go.Binding("text", "title")),
    
    // Device icon
    $(go.Picture, { 
      name: "ICON",
      width: 80,
      height: 80,
      imageStretch: go.GraphObject.Uniform,
      alignment: go.Spot.Center,
      margin: new go.Margin(0, 10, 0, 10)
    }, new go.Binding("source", "type", (t) => {
      if (t === "Router" && deviceIcons[t]) {
        return deviceIcons[t].url;
      }
      return "";
    })),
    
    // Invisible hit area for better interaction
    $(go.Shape, "Rectangle", { 
      fill: "transparent",
      stroke: null,
      width: 80, 
      height: 80,
      alignment: go.Spot.Center,
      position: new go.Point(0, 0)
    }),
    
    // Status overlay for alerts
    $(go.Shape, "Rectangle", { 
      width: 80,
      height: 80,
      stroke: null,
      fill: "rgba(0,0,0,0)",
      alignment: go.Spot.Center,
      position: new go.Point(0, 0)
    }, new go.Binding("fill", "color", (c) => getTransparentFill(c))),
    
    // Label below
    $(go.TextBlock, { 
      margin: new go.Margin(5, 0, 0, 0),
      font: "12px sans-serif",
      stroke: "#555",
      alignment: go.Spot.Center
    }, new go.Binding("text", "label"))
  ));
}

/**
 * Creates the link template for connections between devices
 * @param {Function} $ - GoJS object factory function
 * @returns {go.Link} The configured link template
 */
export function createLinkTemplate($) {
  return $(go.Link, { 
    routing: go.Link.AvoidsNodes,
    curve: go.Link.JumpOver,
    corner: 10
  },
  $(go.Shape, { strokeWidth: 3, stroke: "#2563eb" }),
  $(go.Shape, { toArrow: "Standard", fill: "#2563eb", stroke: null })
  );
}

/**
 * Creates the initial network model data
 * @returns {Object} Object containing nodes and links arrays
 */
export function getInitialNetworkData() {
  return {
    nodes: [
      { key: "R1", title: "Router 1", label: "192.168.1.1", type: "Router", color: "lightblue" },
      { key: "R2", title: "Router 2", label: "192.168.1.2", type: "Router", color: "lightblue" }
    ],
    links: [
      { from: "R1", to: "R2" }
    ]
  };
}

/**
 * Positions nodes in the diagram
 * @param {go.Diagram} diagram - The GoJS diagram
 */
export function positionNodes(diagram) {
  diagram.commit(d => {
    const r1 = d.findNodeForKey("R1");
    const r2 = d.findNodeForKey("R2");
    
    if (r1) r1.location = new go.Point(150, 200);
    if (r2) r2.location = new go.Point(350, 200);
  });
}

/**
 * Maps severity level to color code
 * @param {string} severity - The alert severity
 * @returns {string} The corresponding color code
 */
export function getSeverityColor(severity) {
  const colorMap = {
    'critical': '#ef4444',
    'major': '#f97316',
    'minor': '#facc15',
    'info': 'lightblue'
  };
  
  return colorMap[severity] || 'lightblue';
}

/**
 * Creates a semi-transparent fill color for status indicators
 * @param {string} color - The base color
 * @returns {string} The rgba color string
 */
export function getTransparentFill(color) {
  if (color === "lightblue") return "rgba(0,0,0,0)";
  if (color === "#ef4444") return "rgba(239,68,68,0.3)"; // red
  if (color === "#f97316") return "rgba(249,115,22,0.3)"; // orange
  if (color === "#facc15") return "rgba(250,204,21,0.3)"; // yellow
  return "rgba(0,0,0,0)";
}