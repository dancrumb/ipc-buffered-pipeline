import { Readable } from 'stream';
import os from 'os';
import path from 'path';
import net from 'net';
import _ from 'lodash';
import eventToPromise from 'event-to-promise';
import 'babel-polyfill';
import ControlStream from './ControlStream';

class IncomingStream extends Readable {
  constructor(localProcess, localPort) {
    const readableOptions = {
      objectMode: true,
    };

    super(readableOptions);

    this.availableMessages = [];
    this.connections = [];
    this.incomingPackets = [];
    this.open = true;
    this.reading = false;
    this.partial = undefined;

    this.sockName = path.join(os.tmpdir(), `${localProcess}-${localPort}.sock`);

    this.server = net.createServer((socket) => {
      const controlStream = new ControlStream(socket);
      this.connections.push(controlStream);
      socket.once('close', () => {
        this.connections = _.without(this.connections, socket);
      });

      controlStream.on('data', (packet) => {
        if (packet[0] === ControlStream.MESSAGE_AVAILABLE) {
          this.availableMessages.push({
            seqNumber: ControlStream.getSeqNumber(packet),
            controlStream,
          });
          this.sendIfReading();
        }
      });
    });

    this.server.listen(this.sockName);
  }

  receivePacket(handler) {
    if (this.incomingPackets.length !== 0) {
      const packet = this.incomingPackets.shift();
      handler(packet);
    } else {
      this.once('packetsAvailable', () => {
        this.receivePacket(handler);
      });
    }
  }

  close() {
    this.open = false;
  }

  sendIfReading() {
    // console.log('sendIfReading');
    // console.log(`reading: ${this.reading}, open: ${this.open}`);
    if (this.reading) {
      if (this.open) {
        const messageToSend = this.availableMessages.shift();
        if (messageToSend) {
          // console.log('messageToSend: ',messageToSend.seqNumber);
          messageToSend.controlStream.requestMessage(messageToSend.seqNumber);
          eventToPromise(messageToSend.controlStream, 'data')
            .then((packet) => {
              if (packet[0] === ControlStream.MESSAGE) {
                try {
                  return JSON.parse(packet.slice(1).toString('utf8'));
                } catch (e) {
                  console.error(`JSON Parse error on: ${packet.slice(1).toString('hex')}`);
                  this.emit('error', e);
                  return null;
                }
              }
              this.emit('error', new Error('Received non MESSAGE response'));
              return null;
            })
            .then((message) => {
              if (message !== null) {
                this.push(message);
                process.nextTick(::this.sendIfReading);
              }
            });
        }
      } else {
        this.push(null);
      }
    }
  }

  _read() {
    this.reading = true;
    this.sendIfReading();
  }
}


const stream = new IncomingStream('COMP2', 'IN');

stream.on('data', () => {
  // console.log('Read: ', data);
});
stream.on('error', (error) => {
  throw error;
});
stream.on('close', () => {
  console.log('IS closed');
});
stream.on('end', () => {
  console.log('IS ended');
});

stream.resume();

setTimeout(() => {
  stream.server.close();
}, 10000);
