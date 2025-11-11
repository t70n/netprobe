import json
import random
import pika
import time
import requests
from datetime import datetime

class DataGenerator:
    def __init__(self, json_file_path):
        with open(json_file_path, 'r') as f:
            self.data = json.load(f)
        self.interface_history = {} 
    
    # ---- system resource simulations ----

    def cpu_usage(self):
        h = datetime.now().hour
        base = 60 if 8 <= h <= 18 else 20 # office hours
        return base + random.randint(-10, 10)
    
    def memory_usage(self):
        return 60 + random.randint(-15, 15)        
    
    # ---- switch interface statistics simulations ----

    def interface_stats(self, name, stats):
        now = datetime.now()
        
        if name not in self.interface_history:
            self.interface_history[name] = {
                'last_update': now,
                'in_packets': stats.get('in-packets', 0),
                'out_packets': stats.get('out-packets', 0)
            }
        
        prev_stats = self.interface_history[name]

        time_delta = (now - prev_stats['last_update']).total_seconds()
        if time_delta == 0:
            time_delta = 1
        
        base_rate = 1000
        in_packets_delta = int(base_rate * time_delta * random.uniform(0.8, 1.2))
        out_packets_delta = int(base_rate * time_delta * random.uniform(0.8, 1.2))
        
        new_stats = {
            'in-octets': stats.get('in-octets', 0) + (in_packets_delta * 1500),
            'out-octets': stats.get('out-octets', 0) + (out_packets_delta * 1500),
            'in-packets': prev_stats['in_packets'] + in_packets_delta,
            'out-packets': prev_stats['out_packets'] + out_packets_delta,
            'in-error-packets': stats.get('in-error-packets', 0) + random.randint(0, 2),
            'out-error-packets': stats.get('out-error-packets', 0) + random.randint(0, 1),
            'in-discarded-packets': stats.get('in-discarded-packets', 0) + random.randint(0, 1),
            'out-discarded-packets': stats.get('out-discarded-packets', 0),
            'last-clear': stats.get('last-clear', now.strftime("%Y-%m-%dT%H:%M:%SZ"))
        }
        
        self.interface_history[name] = {
            'last_update': now,
            'in_packets': new_stats['in-packets'],
            'out_packets': new_stats['out-packets']
        }
        
        return new_stats

    def traffic_rate(self):
        base_in = random.randint(800_000_000, 1_500_000_000)
        base_out = random.randint(600_000_000, 1_200_000_000)
        return {
            'in-bps': base_in,
            'out-bps': base_out
        }

    def update(self):
        now = datetime.now()
        self.data['srl-system:system']['information']['current-datetime'] = now.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        # Update system resource usage
        self.data['srl-system:system']['utilization']['resource'][0]['used-percent'] = self.cpu_usage() 
        self.data['srl-system:system']['utilization']['resource'][1]['used-percent'] = self.memory_usage()

        for fan in self.data['srl-platform:platform']['fan-tray']:
            fan['fan']['speed'] = random.randint(60, 80)
            fan['fan']['speed-rpm'] = random.randint(8000, 10000)

        # Update interface statistics - FIXED KEY NAME
        for iface in self.data['srl_nokia-interfaces:interface']:
            if iface.get('oper-state') == 'up':
                if random.random() < 0.1:  # 10% chance to go down
                    iface['oper-state'] = 'down'
                else:
                    iface['statistics'] = self.interface_stats(iface['name'], iface['statistics'])
                    iface['traffic-rate'] = self.traffic_rate()
            elif iface.get('oper-state') == 'down':
                if random.random() < 0.3:  # 30% chance to come back up
                    iface['oper-state'] = 'up'
                    # need to reset stats when coming back up
                    iface['statistics'] = {'in-packets': 0, 'out-packets': 0, 'in-error-packets': 0, 'out-error-packets': 0, 'in-discarded-packets': 0, 'last-clear': now.strftime("%Y-%m-%dT%H:%M:%SZ")}

        self.data['srl-system:system']['information']['last-booted'] = datetime.now().isoformat()

    # prepared to be sent
    def get_filtered_data(self):
        cpu = self.data['srl-system:system']['utilization']['resource'][0]['used-percent']     
        memory = self.data['srl-system:system']['utilization']['resource'][1]['used-percent']
        fans = [{ 'id': f['id'], 'speed': f['fan']['speed'], 'speed-rpm': f['fan']['speed-rpm'] } for f in self.data['srl-platform:platform']['fan-tray']]    
        
        interfaces = []
        # FIXED: Use correct key name from JSON
        for iface in self.data['srl_nokia-interfaces:interface']:
            iface_data = {
                'name': iface.get('name'),
                'oper-state': iface.get('oper-state'),
                'statistics': iface.get('statistics', {}),
                'traffic-rate': iface.get('traffic-rate', {})
            }
            interfaces.append(iface_data)
        
        return {
            'cpu': cpu,
            'memory': memory,
            'fans': fans,
            'interfaces': interfaces
        }

# ---[ FIXED HOSTNAMES ]---
STATUS_URL = 'http://backend:8080/api/app-status'
AMQP_URL = 'amqp://netprobe:supersecret@rabbitmq'
# ---[ END FIXED ]---

EXCHANGE = 'telemetry_exchange'

def report_status(status):
    try:
        response = requests.post(STATUS_URL, json={'service': 'Producer', 'status': status}, timeout=2)
        print(f"Reported status as: {status}")
    except requests.exceptions.RequestException as e:
        print(f"Failed to report status: {e}")

def connect_to_rabbitmq():
    while True:
        try:
            print("Connecting to RabbitMQ...")
            connection = pika.BlockingConnection(pika.URLParameters(AMQP_URL))
            channel = connection.channel()
            channel.exchange_declare(exchange=EXCHANGE, exchange_type='fanout', durable=True)
            print("Successfully connected to RabbitMQ.")
            report_status('online')
            return connection, channel
        except Exception as e:
            print(f"Failed to connect to RabbitMQ: {e}. Retrying in 5 seconds...")
            report_status('error')
            time.sleep(5)

def main():
    generator = DataGenerator('srl_base_data.json')
    connection, channel = connect_to_rabbitmq()

    try:
        while True:
            try:
                generator.update()
                telemetry_data = generator.get_filtered_data()
                
                message = json.dumps({
                    'timestamp': datetime.now().isoformat(),
                    'device': 'router-core-01',
                    'data': telemetry_data
                })
                
                channel.basic_publish(
                    exchange=EXCHANGE,
                    routing_key='',
                    body=message,
                    properties=pika.BasicProperties(
                        delivery_mode=2,  # make message persistent
                    )
                )
                
                print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Sent telemetry data.")
                time.sleep(10)
                
            except Exception as e:
                print(f"Error sending data: {e}")
                report_status('error')
                connection, channel = connect_to_rabbitmq()
                
    except KeyboardInterrupt:
        print("\nShutting down producer...")
        report_status('offline')
        connection.close()

if __name__ == "__main__":
    main()