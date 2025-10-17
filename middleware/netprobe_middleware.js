import WebSocket from 'ws';

const API_URL = 'http://localhost:8080/api/alarms';

const thresholds = {
    cpu: 80,
    memory: 85,
    fanHighRPM: 9500,
    fanLowRPM: 7000,
    inErrorPackets: 5,
    outErrorPackets: 5,
    inDiscardedPackets: 5,
    trafficBps: 1500000000,
};

async function sendAlarmToAPI(alarm) {
    try {
        const response = await fetch(API_URL, {
            method : 'POST',
            headers : {
                'Content-Type' : 'application/json',
            },
            body: JSON.stringify(alarm),
        });

        if (!response.ok) {
            console.error(`erreur api : ${response.status} - ${response.statusText}`);
            return false;
        }
        const newAlarm = await response.json();
        console.log(`alarme envoyée et crée (ID: ${newAlarm.id})`);
        return true;
    } catch (error) {
        console.error('Erreur lors de l\'envoi de l\'alarme');
        return false;
    }
}

/**
 * 
 * @param {Object} payload - JSON payload from simulator server
 */
function triggerAlarms(payload) {
    const alarms = [];

    const dynamic = payload.dynamic || {};
    const cpu = dynamic.cpu;
    const memory = dynamic.memory;

    if (cpu > thresholds.cpu) {
        alarms.push({ 
            signal_id: 'cpu_high', 
            signal_label: `CPU usage high: ${cpu}%`  
        });
    }

    if (memory > thresholds.memory) {
        alarms.push({ 
            signal_id: 'memory_high', 
            signal_label: `Memory usage high: ${memory}%`  
        });
    }

    if (dynamic.fans) {
        dynamic.fans.forEach(fan => {
            if (fan['speed-rpm'] > thresholds.fanHighRPM) {
                alarms.push({ 
                    signal_id: `fan_${fan.id}_high`,  
                    signal_label: `Fan ${fan.id} running too fast: ${fan['speed-rpm']} RPM` 
                });
            }
            if (fan['speed-rpm'] < thresholds.fanLowRPM) {
                alarms.push({ 
                    signal_id: `fan_${fan.id}_low`, 
                    signal_label: `Fan ${fan.id} running too slow: ${fan['speed-rpm']} RPM` 
                });
            }
        });
    }

    if (dynamic.interfaces) {
        dynamic.interfaces.forEach(iface => {
            const stats = iface.statistics || {};
            const traffic = iface['traffic-rate'] || {};

            if (iface['oper-state'] === 'down') {
                alarms.push({ 
                    signal_id: `iface_${iface.name}_down`, 
                    signal_label: `Interface ${iface.name} is down` 
                });
            }
            if ((stats['in-error-packets'] || 0) > thresholds.inErrorPackets) {
                alarms.push({ 
                    signal_id: `iface_${iface.name}_in_error`, 
                    signal_label: `Interface ${iface.name} has too many input errors (CRC-CheckSum): ${stats['in-error-packets']}` 
                });
            }
            if ((stats['out-error-packets'] || 0) > thresholds.outErrorPackets) {
                alarms.push({ 
                    signal_id: `iface_${iface.name}_out_error`, 
                    signal_label: `Interface ${iface.name} has too many output errors (abandonned): ${stats['out-error-packets']}` 
                });
            }
            if ((stats['in-discarded-packets'] || 0) > thresholds.inDiscardedPackets) {
                alarms.push({ 
                    signal_id: `iface_${iface.name}_in_discarded`, 
                    signal_label: `Interface ${iface.name} discards too many input packets (bufferOverFlow): ${stats['in-discarded-packets']}` 
                });
            }
            if ((traffic['in-bps'] || 0) > thresholds.trafficBps) {
                alarms.push({ 
                    signal_id: `iface_${iface.name}_in_traffic`, 
                    signal_label: `Interface ${iface.name} inbound traffic too high: ${traffic['in-bps']} bps` 
                });
            }
            if ((traffic['out-bps'] || 0) > thresholds.trafficBps) {
                alarms.push({ 
                    signal_id: `iface_${iface.name}_out_traffic`, 
                    signal_label: `Interface ${iface.name} outbound traffic too high: ${traffic['out-bps']} bps` 
                });
            }
        });
    }

    return alarms;
}

async function connectToServer() {
    try {
        const ws = new WebSocket('ws://localhost:8765');
        
        ws.onopen = () => {
            console.log('awaiting data...');
        };

        ws.onmessage = async (event) => {
            try {
                const payload = JSON.parse(event.data);
                const alarms = triggerAlarms(payload);

                if (alarms.length > 0) {
                    console.table(alarms); 
                    const sendPromises = alarms.map(alarm => sendAlarmToAPI(alarm));
                    await Promise.all(sendPromises);
                } else {
                    console.log('no alarms triggered');
                }
                console.log('--------------');
            } catch (error) {
                console.error('error processing message:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('wb error:', error);
        };

        ws.onclose = () => {
            console.log('connection closed');
        };

    } catch (error) {
        console.error('impossible to connect:', error);
    }
}

connectToServer();