import { Duplex } from 'stream';
import 'babel-polyfill';

function getPacketsAndPartial(data) {
  let cursor = 0;
  // console.log('getPacketsAndPartial: ', data);
  // console.log(this.partial);


  while (cursor < data.length) {
    const partial = this.partial;
    let length;

    if (partial.length) {
      length = partial.length - partial.cursor;
    } else {
      partial.length = data[cursor];
      length = partial.length;
      partial.cursor = 0;

      partial.bytes = Buffer.allocUnsafe(partial.length);
      cursor += 1;
    }

    // console.log(partial, cursor);

    const bytesToRead = Math.min(length, data.length - cursor);
    const bytes = data.slice(cursor, cursor + bytesToRead);
    bytes.copy(partial.bytes, partial.cursor);
    partial.cursor += bytesToRead;
    cursor += bytesToRead;

    // console.log(partial, cursor);
    if (partial.cursor === partial.length) {
      // console.log('PACKET IN: ', partial.bytes);
      this.incomingPackets.push(partial.bytes);
      this.partial = { length: 0 };
      if (this.reading) {
        process.nextTick(::this._read);
      }
    }
  }
}

class ControlStream extends Duplex {
  constructor(socket) {
    super({ objectMode: true });

    this.socket = socket;
    this.incomingPackets = [];
    this.outgoingPackets = [];
    this.partial = { length: 0 };
    this.reading = false;

    this.socket.on('data', this::getPacketsAndPartial);

    this.on('finish', () => {
      this.socket.end();
    });
  }

  _read() {
    this.reading = true;
    while (this.incomingPackets.length > 0) {
      const packet = this.incomingPackets.shift();
      this.push(packet);
    }
  }

  _write(packet, encoding, callback) {
    this.socket.write(packet, callback);
  }

  sendPackets() {
    if (this.outgoingPackets.length > 0) {
      const packet = this.outgoingPackets.shift();
      if (this.write(packet.packet, packet.callback || (() => {}))) {
        // console.log('PACKET OUT: ', packet.packet);
        process.nextTick(::this.sendPackets);
      } else {
        this.on('drain', ::this.sendPackets);
      }
    }
  }

  requestMessage(seqNumber, callback) {
    const packet = Buffer.from([
      5,
      ControlStream.MESSAGE_REQUESTED,
      0, 0, 0, 0,
    ]);
    packet.writeUInt32LE(seqNumber, 2);
    this.outgoingPackets.push({ packet, callback });
    this.sendPackets();
  }

  reportMessageAvailable(seqNumber, callback) {
    const packet = Buffer.from([
      5,
      ControlStream.MESSAGE_AVAILABLE,
      0, 0, 0, 0,
    ]);
    packet.writeUInt32LE(seqNumber, 2);
    this.outgoingPackets.push({ packet, callback });
    this.sendPackets();
  }

  sendMessage(message, callback) {
    const json = JSON.stringify(message);
    const packet = Buffer.concat([
      Buffer.from([json.length + 1, ControlStream.MESSAGE]),
      Buffer.from(json),
    ]);
    this.outgoingPackets.push({ packet, callback });
    this.sendPackets();
  }

  static isValidRequest(packet, seqNumber) {
    const packetSeqNumber = ControlStream.getSeqNumber(packet);
    return packet[0] === ControlStream.MESSAGE_REQUESTED && packetSeqNumber === seqNumber;
  }

  static getSeqNumber(packet) {
    return packet.readUInt32LE(1);
  }

}

ControlStream.MESSAGE_AVAILABLE = 1;
ControlStream.MESSAGE_REQUESTED = 2;
ControlStream.MESSAGE = 3;

export default ControlStream;
