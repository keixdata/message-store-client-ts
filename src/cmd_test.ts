import { sendCommand, subscribe } from ".";

/*
sendCommand({
    category: 'abc',
    command:'TEST',
    data: { }
})*/


subscribe({
    streamName: 'abc:command'
},
async (evt) => {
    console.log(evt);
    return true;
})