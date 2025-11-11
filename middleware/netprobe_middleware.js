import amqp from 'amqplib';
import axios from 'axios';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://netprobe:supersecret@rabbitmq:5672';
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:8080';
const EXCHANGE = 'telemetry_exchange';

// Report service status to backend
async function reportStatus(status) {
  try {
    await axios.post(`${BACKEND_URL}/api/app-status`, {
      service: 'Consumer',
      status: status
    });
    console.log(`Reported status as: ${status}`);
  } catch (error) {
    console.error(`Failed to report status:`, error.message);
  }
}

// Connect to RabbitMQ with retry logic
async function connectToRabbitMQ() {
  while (true) {
    try {
      console.log('Connecting to RabbitMQ...');
      const connection = await amqp.connect(RABBITMQ_URL);
      const channel = await connection.createChannel();
      
      // Declare exchange as durable to match producer
      await channel.assertExchange(EXCHANGE, 'fanout', { durable: true });
      
      console.log('Successfully connected to RabbitMQ.');
      await reportStatus('online');
      return { connection, channel };
    } catch (error) {
      console.error(`Failed to connect to RabbitMQ: ${error.message}. Retrying in 5 seconds...`);
      await reportStatus('error');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Analyze telemetry data and create alarms
function analyzeTelemetry(telemetryData) {
  const alarms = [];
  const { device, data, timestamp } = telemetryData;

  // Check CPU usage
  if (data.cpu > 80) {
    alarms.push({
      device,
      severity: data.cpu > 90 ? 'critical' : 'major',
      message: `High CPU usage: ${data.cpu}%`,
      metric: 'cpu',
      value: data.cpu,
      timestamp: timestamp || new Date().toISOString()
    });
  }

  // Check memory usage
  if (data.memory > 85) {
    alarms.push({
      device,
      severity: data.memory > 95 ? 'critical' : 'warning',
      message: `High memory usage: ${data.memory}%`,
      metric: 'memory',
      value: data.memory,
      timestamp: timestamp || new Date().toISOString()
    });
  }

  // Check interfaces
  if (data.interfaces) {
    data.interfaces.forEach(iface => {
      if (iface['oper-state'] === 'down') {
        alarms.push({
          device,
          severity: 'major',
          message: `Interface ${iface.name} is down`,
          metric: 'interface_status',
          value: iface.name,
          timestamp: timestamp || new Date().toISOString()
        });
      }

      // Check for high error rates
      const stats = iface.statistics || {};
      const errorRate = (stats['in-error-packets'] || 0) + (stats['out-error-packets'] || 0);
      if (errorRate > 100) {
        alarms.push({
          device,
          severity: 'warning',
          message: `High error rate on interface ${iface.name}: ${errorRate} errors`,
          metric: 'interface_errors',
          value: errorRate,
          timestamp: timestamp || new Date().toISOString()
        });
      }
    });
  }

  return alarms;
}

// Send alarms to backend
async function sendAlarms(alarms) {
  for (const alarm of alarms) {
    try {
      await axios.post(`${BACKEND_URL}/api/alarms`, alarm);
      console.log(`[${new Date().toISOString()}] Created alarm: ${alarm.message}`);
    } catch (error) {
      console.error(`Failed to send alarm:`, error.message);
      // Re-throw the error to be caught by the consumer loop
      throw error; 
    }
  }
}

// Main consumer logic
async function main() {
  const { connection, channel } = await connectToRabbitMQ();

  // Create a queue for this consumer
  const { queue } = await channel.assertQueue('', { exclusive: true });
  
  // Bind queue to exchange
  await channel.bindQueue(queue, EXCHANGE, '');

  console.log(`[*] Waiting for messages in queue: ${queue}. To exit press CTRL+C`);

  // Consume messages
  channel.consume(queue, async (msg) => {
    if (msg !== null) {
      try {
        const telemetryData = JSON.parse(msg.content.toString());
        console.log(`[${new Date().toISOString()}] Received telemetry from ${telemetryData.device}`);
        
        // Analyze and create alarms
        const alarms = analyzeTelemetry(telemetryData);
        
        if (alarms.length > 0) {
          await sendAlarms(alarms);
        }
        
        // If sendAlarms was successful, ACK the message
        channel.ack(msg);
      } catch (error) {
        console.error('Error processing message, re-queueing:', error.message);
        
        // ---[ THE FIX ]---
        // This is the new, critical part.
        // Wait 5 seconds before NACK-ing to prevent a "hot loop".
        console.log('Pausing for 5 seconds before re-queueing...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        // ---[ END FIX ]---

        // NACK the message and tell RabbitMQ to re-queue it (true)
        channel.nack(msg, false, true);
      }
    }
  }, { noAck: false });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down consumer...');
    await reportStatus('offline');
    await channel.close();
    await connection.close();
    process.exit(0);
  });
}

main().catch(console.error);