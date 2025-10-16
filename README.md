# NetProbe
**Projet - N7AN04A : Application Internet**
*FRANCOIS - PRADIER - CHAVEROUX*

---

## Backend
Le backend de l'application **NetProbe** est contenu dans le fichier `./backend/netprobe_server.js`.

### Initialisation

#### 1. Installer les dépendances
```bash
cd ./backend; npm install;  cd ..
cd ./test_frontend; npm install;  cd ..
```

#### 2. Initialiser et compléter la base de données avec Prisma
```bash
cd ./backend; npx prisma db push; js ./prisma/jeu_donnees_test.js;cd ..
```
---

### Lancement du backend
Pour lancer le backend, utilisez la commande suivante :
```bash
npx nodemon ./backend/netprobe_server.js
```

---
### Tests
Pour tester le backend, vous pouvez utiliser un client de test frontal.

#### Lancer le client de test
Le client frontal permet de récupérer toutes les entrées de la base de données et se met à jour en temps réel lorsqu'une nouvelle donnée est publiée.
```bash
npx nodemon ./test_frontend/netprobe_client_test.js
```

#### Publier des données dans la base de données
Utilisez le script `jeu_curl_test.sh` pour publier des données :
```bash
chmod +x ./test_middleware/jeu_curl_test.sh
./test_middleware/jeu_curl_test.sh
```
> **Note** : Assurez-vous d'avoir [`jq`](https://stedolan.github.io/jq/) installé sur votre machine pour formater les réponses JSON.

---

### Commandes cURL utiles
Voici quelques commandes cURL pour interagir avec l'API :

#### Récupérer toutes les alarmes
```bash
curl -s -X GET http://localhost:8080/api/alarms | jq
```

#### Ajouter une alarme
```bash
curl -s -X POST http://localhost:8080/api/alarms \
    -H 'Content-Type: application/json' \
    -d '{"signal_id": 0, "signal_label": "Merci JC.Buisson"}' | jq
```

#### Supprimer une alarme
```bash
curl -s -X DELETE http://localhost:8080/api/alarms/{alarm_id} \
    -H 'Content-Type: application/json' | jq
```

#### Mettre à jour une alarme
```bash
curl -s -X PUT http://localhost:8080/api/alarms/{alarm_id} \
    -H 'Content-Type: application/json' \
    -d '{"signal_id": 0, "signal_label": "Merci BCP JC.Buisson pour le troubleshoot"}' | jq
```

> **Remarque** : Les méthodes `PUT` et `DELETE` sont disponibles uniquement à des fins d'apprentissage et de pédagogie. Dans un environnement de production, les routeurs ou appareils IoT ne devraient **pas** avoir accès à ces méthodes.
