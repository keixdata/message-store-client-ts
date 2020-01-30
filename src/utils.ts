import msgpack5 from "msgpack5";

// Let's use a single instance of msgpack.
const pack = msgpack5();

export function serialize(obj: {}) {
  return pack.encode(obj).slice();
}

export function deserialize(buf: Buffer) {
  return pack.decode(buf);
}

export const delay = async (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));
