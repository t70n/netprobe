
// client.js
import io from 'socket.io-client'
import expressXClient from '@jcbuisson/express-x-client'

const socket = io('http://localhost:8080')

const app = expressXClient(socket)

async function main() {
    try {

        app.service('alarms').create({data:{ signal_id: 123, signal_label: 'Test Alarm' }})

    } catch (error) {
        console.error('An error occurred:', error);
    }
}

main()
