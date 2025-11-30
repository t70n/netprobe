// ===[ Netprobe Server ]============================================

// Imports des modules
import { expressX } from '@jcbuisson/express-x';
import { PrismaClient } from '@prisma/client';

// Initialisation des objets Prisma (BDD) et Express-X (WebSocket Server)
const prisma = new PrismaClient();
const netprobeX = expressX();
import bodyParser from 'body-parser';
netprobeX.use(bodyParser.json());                  // Middleware pour parser le JSON

// ---[ ADDED ]---
// Global flag to control the alarm "gate"
let isConsumerPaused = false;
// ---[ END ADDED ]---

// ------------------------------------------------------------------
// ---[ Application Status Tracking ]--------------------------------
// ------------------------------------------------------------------

const serviceStatuses = {
   producer: { name: 'Producer', status: 'unknown', timestamp: new Date() },
   consumer: { name: 'Consumer', status: 'unknown', timestamp: new Date() },
   backend: { name: 'Backend', status: 'online', timestamp: new Date() },
};

netprobeX.createService('app_status', {
   findMany: async () => Object.values(serviceStatuses)
});

netprobeX.service('app_status').publish(async (status, context) => {
   return ['public'];
});

// ------------------------------------------------------------------
// ---[ Express-X for Frontend requests ]----------------------------
// ------------------------------------------------------------------

// Création du service 'alarm' pour gérer les opérations CRUD
netprobeX.createService('alarms', {
   findUnique: prisma.alarm.findUnique,
   create: prisma.alarm.create,
   update: prisma.alarm.update,
   delete: prisma.alarm.delete,
   findMany: prisma.alarm.findMany,

   clearAll: async () => {
      try {
         const result = await prisma.alarm.deleteMany({});
         console.log(`[ALARMS CLEARED] Deleted ${result.count} alarms.`);
         return result;
      } catch (error) {
         console.error('Error clearing all alarms:', error);
         throw error;
      }
   },
});

netprobeX.service('alarms').publish(async (alarm, context) => {
   return ['public'];
});      

netprobeX.addConnectListener((socket) => {
   netprobeX.joinChannel('public', socket);
});

// ------------------------------------------------------------------
// ---[ Express API-Rest Server for middleware ]---------------------
// ------------------------------------------------------------------

// POST /api/app-status - Update service status
netprobeX.post('/api/app-status', (req, res) => {
  try {
    const { service, status } = req.body;
    
    if (!service || !status) {
      return res.status(400).json({ error: 'Service and status are required' });
    }

    const serviceKey = service.toLowerCase();
    
    if (serviceStatuses[serviceKey]) {
      serviceStatuses[serviceKey].status = status;
      serviceStatuses[serviceKey].timestamp = new Date();
    } else {
      serviceStatuses[serviceKey] = {
        name: service,
        status: status,
        timestamp: new Date()
      };
    }

    netprobeX.service('app_status').publish(Object.values(serviceStatuses));
    
    console.log(`Service status updated: ${service} = ${status}`);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating service status:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/app-status - Get all service statuses
netprobeX.get('/api/app-status', (req, res) => {
  try {
    res.json(Object.values(serviceStatuses));
  } catch (error) {
    console.error('Error getting service status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---[ ADDED ENDPOINT ]---
// POST /api/service-control - This fixes the 404 error
netprobeX.post('/api/service-control', (req, res) => {
  const { service, action } = req.body;
  if (service && service.toLowerCase() === 'consumer') {
    if (action === 'stop') {
      isConsumerPaused = true;
      console.log('[CONTROL] Pausing Consumer: Alarm gate is CLOSED.');
      res.status(200).json({ status: 'consumer paused' });
    } else if (action === 'start') {
      isConsumerPaused = false;
      console.log('[CONTROL] Resuming Consumer: Alarm gate is OPEN.');
      res.status(200).json({ status: 'consumer started' });
    } else {
      res.status(400).json({ error: 'Invalid action' });
    }
  } else {
    res.status(400).json({ error: 'Invalid service' });
  }
});
// ---[ END ADDED ENDPOINT ]---


// Route GET pour récupérer toutes les alarmes en BDD Prisma
netprobeX.get('/api/alarms', async (req, res) => {
   try {
       const alarms = await prisma.alarm.findMany();
       res.status(200).json(alarms);
   } catch (error) {
       console.error('Erreur lors de la récupération des alarmes :', error);
       res.status(500).send('Erreur lors de la récupération des alarmes.');
   }
});

// Route POST pour créer une nouvelle alarme en BDD Prisma
netprobeX.post('/api/alarms', async (req, res) => {
   
   // ---[ MODIFIED ]---
   // Check the "gate" first.
   if (isConsumerPaused) {
      // Return 503 Service Unavailable.
      // The middleware will catch this error and re-queue the message.
      console.log('[ALARM IGNORED] Consumer is paused. Alarm will be re-queued.');
      return res.status(503).send('Service Paused');
   }
   // ---[ END MODIFIED ]---

   try {
      const alarmData = {
         signal_id: req.body.signal_id || req.body.metric || 'unknown',
         signal_label: req.body.signal_label || req.body.message || 'No description',
         device: req.body.device || null,
         severity: req.body.severity || null,
         message: req.body.message || null,
         metric: req.body.metric || null,
         value: req.body.value ? String(req.body.value) : null,
         timestamp: req.body.timestamp || new Date().toISOString(),
      };

      const newAlarm = await netprobeX.service('alarms').create({
         data: alarmData,
      });
      
      console.log(`[ALARM CREATED] ${alarmData.signal_label || alarmData.message}`);
      res.status(201).json(newAlarm);
   } catch (error) {
      console.error('Erreur lors de la création de l\'alarme :', error);
      res.status(500).send('Erreur lors de la création de l\'alarme.');
   }
});

// Route DELETE pour supprimer une alarme par son ID
netprobeX.delete('/api/alarms/:id', async (req, res) => {
   const { id } = req.params;
   try {
      const delAlarm = await netprobeX.service('alarms').delete({
         where: { id: parseInt(id) },
      });
      res.status(200).json(delAlarm);
   } catch (error) {
         console.error('Erreur lors de la suppression de l\'alarme :', error);
         res.status(500).send('Erreur lors de la suppression de l\'alarme.');
   }
});

// Route PUT pour mettre à jour une alarme par son ID
netprobeX.put('/api/alarms/:id', async (req, res) => {
   const { id } = req.params;
   const { signal_id, signal_label } = req.body;
   try {
      const updatedAlarm = await netprobeX.service('alarms').update({
         where: { id: parseInt(id) },
         data: { signal_id, signal_label },
      });
      res.status(200).json(updatedAlarm);
   } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'alarme :', error);
      res.status(500).send('Erreur lors de la mise à jour de l\'alarme.');
   }
});

// ------------------------------------------------------------------

// Démarrage du serveur WebSocket sur le port 8080 
netprobeX.httpServer.listen(8080, '0.0.0.0', () => {
   console.log(`NetProbe Serveur : http://backend:8080`);
});

// ------------------------------------------------------------------