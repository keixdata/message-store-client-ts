import { Client, credentials } from "grpc";
import { serialize, deserialize } from "./utils";
import {
  SendCommandOptions,
  EmitEventOptions,
  SubscriberOptions,
  Message
} from "./types";

const port = process.env.PORT ?? "8080";
const host = process.env.HOST ?? `0.0.0.0:${port}`;

const client = new Client(host, credentials.createInsecure());

export function sendCommand(options: SendCommandOptions, callback) {
  client.makeUnaryRequest(
    "/MessageStore/SendCommand",
    serialize,
    deserialize,
    options,
    null,
    null,
    callback
  );
}

export function emitEvent(options: EmitEventOptions, callback) {
  client.makeUnaryRequest(
    "/MessageStore/EmitEvent",
    serialize,
    deserialize,
    options,
    null,
    null,
    callback
  );
}

export async function subscribe(options: SubscriberOptions, callback) {
  const stream = client.makeServerStreamRequest<SubscriberOptions, Message>(
    "/MessageStore/Subscribe",
    serialize,
    deserialize,
    options
  );
  stream.on("data", callback);
}
