import { expressX } from '@jcbuisson/express-x';
import { PrismaClient } from '@prisma/client';
import bodyParser from 'body-parser';

const prisma = new PrismaClient();
const netprobeX = expressX();
netprobeX.use(bodyParser.json());

// In-memory store for application stack health
const serviceStatuses = {
  middleware: { name: 'Middleware (Consumer)', status: 'unknown', message: 'Not Reported', timestamp: null },
  simulation: { name: 'Simulation (Producer)', status: 'unknown', message: 'Not Reported', timestamp: null },
  backend: { name: 'Backend (API/DB)', status: 'online', message: 'Running', timestamp: new Date() }
};

// --- Express-X Services for Frontend ---

// Service for live network alarms
netprobeX.createService('alarms', {
   findUnique: prisma.alarm.findUnique,
   create: prisma.alarm.create,
   update: prisma.alarm.update,
   delete: prisma.alarm.delete,
   findMany: prisma.alarm.findMany,
});
netprobeX.service('alarms').publish(async () => ['public']);

// Service for live application stack health
netprobeX.createService('app_status', {
   findMany: async () => Object.values(serviceStatuses)
});
netprobeX.service('app_status').publish(() => ['public']);

// Add all new WebSocket clients to the 'public' channel
netprobeX.addConnectListener((socket) => {
   netprobeX.joinChannel('public', socket);
});

// --- REST API for Services ---

// Standard CRUD for alarms
netprobeX.get('/api/alarms', async (req, res) => {
   try {
       const alarms = await prisma.alarm.findMany();
       res.status(200).json(alarms);
   } catch (error) {
       console.error('Erreur /api/alarms GET:', error);
       res.status(500).send('Erreur lors de la récupération des alarmes.');
   }
});

netprobeX.post('/api/alarms', async (req, res) => {
   const { signal_id, signal_label } = req.body;
   try {
      const newAlarm = await netprobeX.service('alarms').create({
         data: { signal_id, signal_label },
      });
      res.status(201).json(newAlarm);
   } catch (error) {
      console.error('Erreur /api/alarms POST:', error);
      res.status(500).send('Erreur lors de la création de l\'alarme.');
   }
});

netprobeX.delete('/api/alarms/:id', async (req, res) => {
   const { id } = req.params;
   try {
      const delAlarm = await netprobeX.service('alarms').delete({
         where: { id: parseInt(id) },
      });
      res.status(200).json(delAlarm);
   } catch (error) {
      console.error('Erreur /api/alarms DELETE:', error);
      res.status(500).send('Erreur lors de la suppression de l\'alarme.');
   }
});

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
      console.error('Erreur /api/alarms PUT:', error);
      res.status(500).send('Erreur lors de la mise à jour de l\'alarme.');
   }
});

// Endpoint for services to report their health
netprobeX.post('/api/app-status', async (req, res) => {
   const { service, status, message } = req.body;
   
   if (serviceStatuses[service]) {
      const oldStatus = serviceStatuses[service].status;
      serviceStatuses[service].status = status;
      serviceStatuses[service].message = message;
      serviceStatuses[service].timestamp = new Date();

      if (oldStatus !== status) {
         netprobeX.publish(['public'], 'app_status', 'update', serviceStatuses[service]);
         console.log(`[AppStatus] Update for ${service}: ${status}`);
      }
      res.status(200).json({ received: true });
   } else {
      res.status(404).send('Service not found');
   }
});

// --- Server Start ---
netprobeX.httpServer.listen(8080, () => {
   console.log(`NetProbe Backend Server listening on http://localhost:8080`);
});