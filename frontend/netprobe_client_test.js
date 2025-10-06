// client.js
import io from 'socket.io-client'
import expressXClient from '@jcbuisson/express-x-client'

const socket = io('http://localhost:8080')

const app = expressXClient(socket)

async function main() {
    try {

        const initialAlarms = await app.service('alarms').findMany({})
        console.log('Initial Alarms:', initialAlarms)

        app.service('alarms').on('created', (alarms) => {
            console.log('New Alarm Created:', alarms)
        })


    } catch (error) {
        console.error('An error occurred:', error);
    }
}

main()
