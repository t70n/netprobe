# NetProbe Components

This directory contains the Vue components used in the NetProbe application.

## Component Overview

### Dashboard.vue

The main dashboard component that displays metrics and serves as a container for other components.

**Features:**
- Overall network health display
- Container layout for Topology and Alerts panels
- Navigation controls

### Topology.vue

Network topology visualization component that displays devices and connections.

**Features:**
- Interactive network diagram using GoJS
- Real-time status updates with color indicators
- Displays routers and connections between them

### AlertsPanel.vue

Displays real-time alerts from network devices.

**Features:**
- Real-time alert notifications
- Color-coding based on severity
- Chronological ordering of alerts