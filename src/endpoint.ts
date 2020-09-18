import express from "express";
import { SubscriberStats } from "./types";
const { version: clientVersion } = require("../package.json");

const endpointPort = process.env.ENDPOINT_PORT ?? 8080;

export function createEndpoint() {
  const app = express();

  const startDate = new Date();

  let keepAlive: { [subscriberId: string]: Date } = {};
  let stats: { [subscriberId: string]: SubscriberStats } = {};

  app.get("/info", (req, res) => {
    const uptime = new Date().getTime() - startDate.getTime();
    res.json({
      clientVersion,
      uptime,
      stats,
      keepAlive,
    });
  });

  return {
    onKeepAlive: (subscriberId: string, date: Date) => {
      keepAlive[subscriberId] = date;
    },
    onStatsUpdated: (subscriberId: string, stat: SubscriberStats) => {
      stats[subscriberId] = stat;
    },
    listen: () => {
      app.listen(endpointPort, () => {
        console.log(
          `Message store internal endpoint running at ${endpointPort}...`
        );
      });
    },
  };
}
