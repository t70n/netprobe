// ===[ Netprobe Server ]============================================

// Imports des modules
import { expressX } from '@jcbuisson/express-x';
import { PrismaClient } from '@prisma/client';

// Initialisation des objets Prisma (BDD) et Express-X (WebSocket Server)
const prisma = new PrismaClient();
const netprobeX = expressX();
import bodyParser from 'body-parser';
netprobeX.use(bodyParser.json());                  // Middleware pour parser le JSON

// ------------------------------------------------------------------
// ---[ Express-X for Frontend requests ]----------------------------
// ------------------------------------------------------------------

// Création du service 'alarm' pour gérer les opérations CRUD
netprobeX.createService('alarms', {
   findUnique: prisma.alarm.findUnique,            // Trouver une alarme par son ID unique
   create: prisma.alarm.create,                    // Créer une nouvelle alarme
   update: prisma.alarm.update,                    // Mettre à jour une alarme existante        /!\ SHOULD NOT BE ALLOWED FOR FRONTEND /!\
   delete: prisma.alarm.delete,                    // Supprimer une alarme existante            /!\ SHOULD NOT BE ALLOWED FOR FRONTEND /!\
   findMany: prisma.alarm.findMany,                // Récupérer toutes les alarmes
});

// Publication des alarmes aux clients abonnés au service 'alarms' par WebSocket sur le canal 'alarms'
netprobeX.service('alarms').publish(async (alarm, context) => {
   return ['public'];
});      

// Écouteur pour les connexions clients WebSocket et les ajoute au canal 'public'
netprobeX.addConnectListener((socket) => {
   netprobeX.joinChannel('public', socket);
});

// ------------------------------------------------------------------
// ---[ Express API-Rest Server for middleware ]---------------------
// ------------------------------------------------------------------

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
   const { signal_id, signal_label } = req.body;
   try {
      const newAlarm = await netprobeX.service('alarms').create({
         data: {
            signal_id,
            signal_label,
         },
      });
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
netprobeX.httpServer.listen(8080, () => {
   console.log(`NetProbe Serveur : http://localhost:8080`);
});

// ------------------------------------------------------------------

