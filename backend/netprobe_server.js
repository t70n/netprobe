// ===[ Netprobe Server ]============================================

// Imports des modules
import { expressX } from '@jcbuisson/express-x';
import { PrismaClient } from '@prisma/client';
import express from 'express';

// Initialisation des objets Prisma (BDD) et Express-X (WebSocket Server)
const prisma = new PrismaClient();
const netprobe = express();
const netprobeX = expressX(prisma);

// ---[ Express-X WebSocket Server ]---------------------------------

// Création du service 'alarm' pour gérer les opérations CRUD
netprobeX.createService('alarm', {
   findUnique: prisma.alarm.findUnique,         // Trouver une alarme par son ID unique
   create: prisma.alarm.create,                 // Créer une nouvelle alarme
   update: prisma.alarm.update,                 // Mettre à jour une alarme existante
   delete: prisma.alarm.delete,                 // Supprimer une alarme
   findMany: prisma.alarm.findMany,             // Récupérer toutes les alarmes
});

// Publication des alarmes aux clients abonnés au service 'alarm' par WebSocket sur le canal 'alarm'
netprobeX.service('alarm').publish(async (alarm, context) => {
   return ['alarm'];
});

// Écouteur pour les connexions clients WebSocket et les ajoute au canal 'alarm'
netprobeX.addConnectListener((socket) => {
   netprobeX.joinChannel('alarm', socket);
});

// ---[ Express API-Rest Server ]------------------------------------

// Parser le JSON
netprobe.use(express.json());

// Route GET pour récupérer toutes les alarmes en BDD Prisma
netprobe.get('/alarms', async (req, res) => {
   try {
       const alarms = await prisma.alarm.findMany();
       res.status(200).json(alarms);
   } catch (error) {
       console.error('Erreur lors de la récupération des alarmes :', error);
       res.status(500).send('Erreur lors de la récupération des alarmes.');
   }
});

// Démarrage du serveur Rest API sur le port 6777 --> Récupération des alarmes
netprobe.listen(6777, () => console.log(`App listening at http://localhost:6777`))

// Démarrage du serveur WebSocket sur le port 8000 --> Gestion des alarmes depuis le front 
netprobeX.httpServer.listen(8000, () => {
   console.log(`NetProbe Serveur : http://localhost:8000`);
});
