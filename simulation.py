import json
import time
import random
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
    
    # ---- Switch interface statistics simulations ----

    def interface_stats(self, name, stats):
        now = datetime.now()
        
        if name not in self.interface_history:
            self.interface_history[name] = {
                'in': stats.get('in-packets', 0),
                'out': stats.get('out-packets', 0),
                'last_update': now
            }
            
        
        prev_stats = self.interface_history[name]
        time_elapsed = (now - prev_stats['last_update']).total_seconds()
        traffic_multiplier = 3.0 if 8 <= now.hour <= 18 else 1.0

        # to create something coherent over time
        inc = int(random.randint(500, 1000) * traffic_multiplier * time_elapsed)

        new_stats = {
            'in-packets': prev_stats['in'] + inc,
            'out-packets': prev_stats['out'] + int(inc * random.uniform(0.7, 1.3)),
            'in-error-packets': stats.get('in-error-packets', 0) + random.randint(0, 2),
            'out-error-packets': stats.get('out-error-packets', 0) + random.randint(0, 1),
            'in-discarded-packets': stats.get('in-discarded-packets', 0) + random.randint(0, 1),
            'last-clear': stats.get('last-clear', "2024-06-15T00:00:00Z")
        }
        self.interface_history[name] = {
            'in': new_stats['in-packets'],
            'out': new_stats['out-packets'],
            'last_update': now
        }
        return new_stats
       
    def traffic_rate(self):
        h = datetime.now().hour
        base = 2000000000 if 8 <= h <= 18 else 500000000 
        return {'in-bps': int(base * random.uniform(0.4, 0.5)), 'out-bps': int(base * random.uniform(0.6, 0.9))}

    
    def update(self):
        now = datetime.now()
        self.data['srl-system:system']['information']['current-datetime'] = now.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        # Update system resource usage
        self.data['srl-system:system']['utilization']['resource'][0]['used-percent'] = self.cpu_usage() 
        self.data['srl-system:system']['utilization']['resource'][1]['used-percent'] = self.memory_usage()

        for fan in self.data['srl-platform:platform']['fan-tray']:
            fan['fan']['speed'] = random.randint(60, 80)
            fan['fan']['speed-rpm'] = random.randint(8000, 10000)

        # Update interface statistics
        for iface in self.data['srl_nokia-interfaces:interface']:
            if iface.get('oper-state') == 'up':
                if random.random() < 0.1:  # 10% chance to go down
                    iface['oper-state'] = 'down'
                else:
                    iface['statistics'] = self.interface_stats(iface['name'], iface['statistics'])
                    iface['traffic-rate'] = self.traffic_rate()
            if iface.get('oper-state') == 'down':
                if random.random() < 0.3:  # 30% chance to come back up
                    iface['oper-state'] = 'up'
                    # need to reset stats when coming back up
                    iface['statistics'] = {'in-packets': 0, 'out-packets': 0, 'in-error-packets': 0, 'out-error-packets': 0, 'in-discarded-packets': 0, 'last-clear': now.strftime("%Y-%m-%dT%H:%M:%SZ")}
                    

    # ---- JSON methods ----
    
    def get_data(self):
        return self.data
    
    def save_data(self, filename=None):
        if not filename:
            filename = f"srl_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(filename, 'w') as f:
            json.dump(self.data, f, indent=2)
        return filename

def main():

    generator = DataGenerator('srl_base_data.json')
    update = 0

    try:
        while True:
            generator.update()
            
            if update % 5 == 0:
                print(f"Data saved to {generator.save_data()}")
            update += 1

            time.sleep(10) # wait before next update
    except KeyboardInterrupt:
        print("Simulation stopped.")

if __name__ == "__main__":
    main()