import { Writable } from 'stream';
import os from 'os';
import path from 'path';
import net from 'net';
import Promise from 'bluebird';
import 'babel-polyfill';

import ControlStream from './ControlStream';

class OutgoingStream extends Writable {
  constructor(localProcess, localPort, capacity = 20) {
    const writableOptions = {
      objectMode: true,
      highWaterMark: capacity,
    };

    super(writableOptions);

    this.buffer = [];
    this.seqNumber = 1;
    this.isConnected = false;

    this.partial = undefined;

    this.sockName = path.join(os.tmpdir(), `${localProcess}-${localPort}.sock`);

    this.on('finish', () => {
      console.log('fin');
      if (this.controlStream) {
        this.controlStream.end();
      }
    });
  }

  connect(remoteProcess, remotePort) {
    this.remoteSockname = path.join(os.tmpdir(), `${remoteProcess}-${remotePort}.sock`);
    return new Promise((resolve, reject) => {
      const socket = net.connect(this.remoteSockname, resolve);
      this.controlStream = new ControlStream(socket);
      this.controlStream.on('error', (error) => {
        console.error(`Some kind of error on the OutgoingStream: ${remoteProcess}.${remotePort}`);
        reject(error);
      });
      this.isConnected = true;
    });
  }

  _write(message, encoding, callback) {
    message.seqNumber = this.seqNumber; // eslint-disable-line no-param-reassign
    this.seqNumber += 1;

    this.buffer.push(message);
    this.controlStream.reportMessageAvailable(message.seqNumber);
    this.controlStream.once('data', (packet) => {
      if (ControlStream.isValidRequest(packet, message.seqNumber)) {
        const nextMessage = this.buffer.shift();
        if (nextMessage.seqNumber !== message.seqNumber) {
          callback(new Error(`Invalid seqNumber: ${nextMessage.seqNumber}. Expected ${message.seqNumber}`));
        } else {
          delete nextMessage.seqNumber;
          this.controlStream.sendMessage(nextMessage, callback);
        }
      } else {
        this.emit('error', new Error('Invalid packet'));
      }
    });
  }
}


const stream1 = new OutgoingStream('COMP', 'OUT1');
const start = +(new Date()) / 1000;
const ops = 1000000;

stream1.connect('COMP2', 'IN').then(() => Promise.coroutine(function* looper(times) {
  for (let i = 0; i < times; i += 1) {
    yield new Promise((resolve, reject) => {
      stream1.write({ i }, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
})(ops)
).then(() => {
  const end = +(new Date()) / 1000;
  console.log('fin');
  console.log(`Time: ${end - start}`);
  console.log(`Rate: ${ops / (end - start)}`);
  stream1.end();
});
