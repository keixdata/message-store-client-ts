import {
  mockMessageStore,
  pushMessage,
  getStreamMessages,
  setupMessageStore
} from "../test_utils";
import { sendCommand } from "..";

test("the mocked message store adds messages to the streams and calculate the positions", () => {
  setupMessageStore([
    { stream_name: "example", type: "SAY_HELLO", data: {}, metadata: {} }
  ]);

  pushMessage({
    stream_name: "example",
    type: "SAY_HELLO",
    data: {},
    metadata: {}
  });
  pushMessage({
    stream_name: "example-abc",
    type: "SAY_HELLO",
    data: {},
    metadata: {}
  });

  let messages = getStreamMessages("example");
  expect(messages).toHaveLength(2);
  expect(messages[1].id).not.toBeUndefined();
  expect(messages[1].global_position).toEqual(1);
  expect(messages[1].position).toEqual(1);

  messages = getStreamMessages("example-abc");
  expect(messages).toHaveLength(1);
  expect(messages[0].id).not.toBeUndefined();
  expect(messages[0].global_position).toEqual(2);
  expect(messages[0].position).toEqual(0);
});
