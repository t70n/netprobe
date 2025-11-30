# NetProbe - A Full-Stack Network Monitoring Dashboard

**Projet - N7AN04A : Application Internet**
*FRANCOIS - PRADIER - CHAVEROUX*

---

NetProbe is a real-time network monitoring application built on a modern, event-driven, microservice architecture. It features a live-updating Vue.js frontend that visualizes network topology, displays live alerts, and monitors the health of its own application stack.

## Architecture

This project is fully containerized using Docker Compose and uses RabbitMQ as a resilient message bus to decouple services.

* **Frontend:** A Vue.js 3 application (with Vuetify) that serves the user dashboard. It connects to the backend via REST and WebSockets.
* **Backend:** A Node.js server using Express-X. It serves the REST API, manages the SQLite database (with Prisma), and broadcasts all real-time updates to the frontend via two WebSocket channels:
    1.  `alarms`: For live network alerts.
    2.  `app_status`: For live "meta" monitoring of the application's own services.
* **Middleware (Consumer):** A Node.js service that subscribes to the RabbitMQ message bus, consumes telemetry data, runs alarm-triggering logic, and POSTs alarms and stats to the Backend.
* **Simulation (Producer):** A Python service that generates (simulated) network telemetry and publishes it to the RabbitMQ bus.
* **Message Bus:** RabbitMQ (using a `fanout` exchange) acts as the resilient data pipeline, buffering data and decoupling the producer from the consumer.



---

## Prerequisites

* [Docker](https://www.docker.com/products/docker-desktop/)
* [Docker Compose](https://docs.docker.com/compose/install/)
* A web browser (Chrome, Firefox, etc.)
* (For Deployment) `nginx`, `git`

---

## Quick Start (Local Development)

1.  **Clone the repository:**
    ```bash
    git clone [your-repo-url]
    cd netprobe-final
    ```

2.  **Build and Run the Stack:**
    ```bash
    docker-compose up --build
    ```

3.  **Initialize the Database:**
    *In a separate terminal*, run this command once the containers are up:
    ```bash
    docker-compose exec backend npx prisma db push
    ```

4.  **View the Application:**
    * **NetProbe UI:** `http://localhost:5173`
    * **RabbitMQ Management UI:** `http://localhost:15672` (User: `netprobe`, Pass: `supersecret`)

---

## Production Deployment (VPS)

These instructions assume a production VPS running `nginx` and `certbot` for SSL.

1.  **Stop Old Services:**
    If you were using `pm2`, stop and remove it from startup:
    ```bash
    pm2 stop all
    pm2 delete all
    pm2 save
    pm2 unstartup
    # (Run the command pm2 gives you to remove it from startup)
    ```

2.  **Get the Code:**
    ```bash
    cd /home/webapp/web-project/netprobe
    git pull
    ```

3.  **Build the Static Frontend:**
    This step bundles the Vue.js app for Nginx to serve.
    ```bash
    cd /home/webapp/web-project/netprobe/frontend
    npm install
    npm run build
    cd ..
    ```

4.  **Launch the Docker Stack:**
    This will build and run the `backend`, `middleware`, `simulation`, and `rabbitmq` containers in the background. The `docker-compose.yml` is configured to bind the backend to `127.0.0.1:8080`, which your existing Nginx proxy will pick up.
    ```bash
    docker-compose up --build -d
    ```

5.  **Initialize the Database:**
    (Only needed the first time, or after a `docker-compose down -v`)
    ```bash
    docker-compose exec backend npx prisma db push
    ```

Your application is now live and managed by Docker.

---

## Services

* **`frontend`**: (Dev) Runs on `localhost:5173`. (Prod) Served by Nginx.
* **`backend`**: (Prod) Runs on `localhost:8080`, proxied by Nginx.
* **`rabbitmq`**: (Prod) Runs on `localhost:15672` (for UI) and `5672` (for AMQP).
* **`middleware`**: Internal service.
* **`simulation`**: Internal service.