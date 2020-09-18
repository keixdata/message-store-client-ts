import express from 'express';
const { version: clientVersion } = require('../package.json');

const endpointPort = process.env.ENDPOINT_PORT ?? 8080;

export function createEndpoint() {
    const app = express();
    const startDate = new Date();
    let keepAlive: { [subscriberId: string]: Date } = {};

    app.get('/info', (req, res) => {
        const uptime = new Date().getTime() - startDate.getTime();
        res.json({
            clientVersion,
            uptime,
            keepAlive
        })
      })

 

    return {
        onKeepAlive: (subscriberId: string, date: Date) => {
            keepAlive[subscriberId] = date;
        },
        listen: () => {
            app.listen(endpointPort, () => {
                console.log(`Message store internal endpoint running at ${endpointPort}...`)
            })
        }
    }
}