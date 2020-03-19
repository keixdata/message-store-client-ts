import { subscribe } from ".";

async function run() {
  const stop = subscribe({ streamName: "ticket" }, (msg, ctx) => {
    console.log(msg);
    return Promise.resolve({});
  });
}

run();
