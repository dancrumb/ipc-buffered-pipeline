import FIFO from 'event-emitting-fifo';
import ipc from 'node-ipc';
import _ from 'lodash';
import Promise from 'bluebird';
import Port from './Port';
import Message from './Message';

function trySend(message, resolve) {
  if (!this.remotePort) {
    throw new Error('Not currently connected to a remote Port');
  }

  ipc.log(`Capacity: ${this.queue.length}/${this.capacity}`);

  if (this.queue.length >= this.capacity) {
    ipc.log('Full');
    this.queue.once('messageRemoved', () => {
      trySend.call(this, message, resolve);
    });
  } else {
    ipc.log('Sending: ', message);
    message.release();
    this.queue.enqueue(message);
    ipc.of[this.remotePort.ipcId].emit('messageAvailable', { port: this.name, ipcId: this.ipcId });
    resolve();
  }
}

function getmessage() {
  if (this.portIsOpen && !this.queue.isEmpty()) {
    return this.queue.dequeue();
  }

  return null;
}

function dequeueAndSendToSocket(socket) {
  ipc.server.emit(socket, 'message', getmessage.call(this));
}

/**
 * @extends Port
 */
class OutgoingPort extends Port {
  constructor(portName, capacity = 20) {
    super(portName);
    this.capacity = capacity;
    this.queue = new FIFO();


    ipc.server.on(`messageRequested:${this.name}`, (data, socket) => {
      ipc.log(`Handling message request: ${data}`);
      if (this.portIsOpen && this.queue.isEmpty()) {
        this.queue.once('noLongerEmpty', () => {
          dequeueAndSendToSocket.call(this, socket);
        });
      } else {
        dequeueAndSendToSocket.call(this, socket);
      }
    });
  }

  /**
   *
   * @param message {Message}
   *
   * @returns {Promise} resolved once the `message` has been passed on
   */
  send(message) {
    if (!this.isOpen()) {
      throw new Error('Cannot send an IP via a closed port');
    }
    if (_.size(this.connections) === 0) {
      throw new Error('Cannot send an IP without a connection to send it on');
    }
    if (message.owner !== this.ipcId) {
      throw new Error('Trying to send message that is not owned by this process');
    }

    return new Promise(resolve => trySend.call(this, message, resolve));
  }

  /**
   * @returns {Number} the number of messages waiting to be sent
   */
  getPendingMessageCount() {
    return this.queue.length;
  }

  connect(ipcId, port) {
    return super.connect(ipcId, port).then((connection) => {
      this.remotePort = connection;
    });
  }

  /**
   * @returns {Number} the number of IPs dropped because this port is closing
   */
  close() {
    super.close();
    const droppedIPCount = this.queue.length;
    this.queue.reset();

    return droppedIPCount;
  }
}

export default OutgoingPort;
