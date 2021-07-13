import { sendCommand, subscribe, synchronizePosition } from ".";
import { Message } from "./types";

/*
sendCommand({
    category: 'abc',
    command:'TEST',
    data: { }
})*/

subscribe(
  {
    streamName: "person",
    subscriberId: "person-test",
  },
  async (evt: Message) => {
    console.log(evt.global_position);
    await delay(500);
    return true;
  }
);

synchronizePosition({
  subscriberId: "person-test",
  position: 383404,
  syncId: "test-sync",
}).then(() => {
  console.log("Now is synced");
});

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
