// client.js
import io from 'socket.io-client'
import expressXClient from '@jcbuisson/express-x-client'

const socket = io('http://localhost:8080')

const app = expressXClient(socket)

async function main() {
    try {

        const initialAlarms = await app.service('alarms').findMany({})
        console.log('Initial Alarms:', initialAlarms)

        app.service('alarms').on('create', (alarm) => {
            console.log('New Alarm Created:', alarm)
        })

        app.service('alarms').on('update', (alarm) => {
            console.log('Alarm Updated:', alarm)
        })

        app.service('alarms').on('delete', (alarm) => {
            console.log('Alarm Deleted:', alarm)
        })

    } catch (error) {
        console.error('An error occurred:', error);
    }
}

main()
