import { Client, credentials } from "grpc";
import { serialize, deserialize } from "./utils";

const port = process.env.PORT ?? "8080";
const host = `0.0.0.0:${port}`;

const client = new Client(host, credentials.createInsecure());

export interface SendCommandOptions {
  command: string;
  category: string;
  data?: {};
  metadata?: {};
  id?: string;
  expectedVersion?: number;
}

const command: SendCommandOptions = {
  command: "sendEmail",
  category: "email"
};

const callback = (err, value) => {
  if (err) {
    console.log(err);
  }
  console.log(value);
};

client.makeUnaryRequest(
  "/EventStore/SendCommand",
  serialize,
  deserialize,
  command,
  null,
  null,
  callback
);
