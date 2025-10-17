# NetProbe
**Projet - N7AN04A : Application Internet**
*FRANCOIS - PRADIER - CHAVEROUX*

---

## Table des matières
1. [Initialisation](#initialisation)
2. [Backend](#backend)
3. [Frontend](#frontend)
4. [Middleware](#middleware)
5. [Simulation](#simulation)
6. [Tests](#tests)
7. [Commandes cURL utiles](#commandes-curl-utiles)

---

## Initialisation
### Installation des dépendances
Exécutez les commandes suivantes pour installer les dépendances de chaque module :

```bash
cd ./backend; npm install; cd ..
cd ./frontend; npm install; cd ..
cd ./middleware; npm install; cd ..
```

---

## Backend
Le backend de l'application **NetProbe** est contenu dans le fichier `./backend/netprobe_server.js`.

### Initialisation de la base de données avec Prisma
```bash
cd ./backend; npx prisma db push; cd ..
```

### Lancement du backend
Pour démarrer le backend, utilisez la commande suivante :
```bash
npx nodemon ./backend/netprobe_server.js
```

---

## Frontend
Le frontend de l'application **NetProbe** est une application **VueJS**, contenue dans le fichier `./frontend/App.vue`.

### Lancement du frontend
Pour démarrer le frontend, ouvrez un nouveau terminal et exécutez :
```bash
cd ./frontend; npm run dev;
```

---

## Simulation
Dans la première version de ce projet, les équipements réseau sont **simulés** à l'aide d'un script Python : `./simulation/simulation.py`.

### Lancement de la simulation
Pour démarrer la simulation, exécutez :
```bash
cd ./simulation/; python3 ./simulation.py
```

### Dépendances requises
Assurez-vous d'avoir installé les paquets Python suivants :
- `json`
- `time`
- `random`
- `asyncio`
- `websockets`
- `datetime`

---

## Middleware
Le middleware de l'application **NetProbe** est contenu dans le fichier `./middleware/netprobe_middleware.js`.

### Lancement du middleware
Pour démarrer le middleware, utilisez la commande suivante :
```bash
npx nodemon ./middleware/netprobe_middleware.js
```

---

## Tests
### Tests Backend
#### Lancer le client de test
Le client frontal permet de récupérer toutes les entrées de la base de données et se met à jour en temps réel :
```bash
npx nodemon ./tests_env/test_frontend/netprobe_client_test.js
```

#### Publier des données dans la base de données
Utilisez le script `jeu_curl_test.sh` :
```bash
chmod +x ./tests_env/test_middleware/jeu_curl_test.sh
./tests_env/test_middleware/jeu_curl_test.sh
```
> **Note** : Assurez-vous d'avoir [jq](https://stedolan.github.io/jq/) installé pour formater les réponses JSON.

### Tests Simulation
Pour tester la simulation, utilisez le script :
`./tests_env/test_simulation/simulation.py`

---

## Commandes cURL utiles
Voici quelques exemples de commandes cURL pour interagir avec l'API :

| Action                     | Commande                                                                                     |
|----------------------------|----------------------------------------------------------------------------------------------|
| Récupérer toutes les alarmes | `curl -s -X GET http://localhost:8080/api/alarms \| jq`                                         |
| Ajouter une alarme          | `curl -s -X POST http://localhost:8080/api/alarms -H 'Content-Type: application/json' -d '{"signal_id": "abc", "signal_label": "Merci JC.Buisson"}' \| jq` |
| Supprimer une alarme        | `curl -s -X DELETE http://localhost:8080/api/alarms/{alarm_id} -H 'Content-Type: application/json' \| jq` |
| Mettre à jour une alarme    | `curl -s -X PUT http://localhost:8080/api/alarms/{alarm_id} -H 'Content-Type: application/json' -d '{"signal_id": "rtyu", "signal_label": "Merci BCP JC.Buisson pour le troubleshoot"}' \| jq` |

> **Remarque** : Les méthodes `PUT` et `DELETE` sont disponibles uniquement à des fins d'apprentissage. Dans un environnement de production, les routeurs ou appareils IoT ne devraient **pas** y avoir accès.