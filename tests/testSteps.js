import ipc from 'node-ipc';
import assert from 'assert';
import IncomingPort from '../src/IncomingPort';
import OutgingPort from '../src/OutgoingPort';
import Message from '../src/Message';

const steps = {
  startProcess: function startProcess(processName) {
    return new Promise((resolve) => {
      ipc.config.silent = true;
      ipc.config.id = processName;
      ipc.serve(resolve);
      ipc.server.start();
    });
  },
  connectToProcess: function connectToProcess(otherProcessName) {
    return new Promise((resolve) => {
      ipc.connectTo(otherProcessName, resolve);
    });
  },
  createOutgoingPort: function createOutgoingPort(name, capacity) {
    this.port = new OutgingPort(name, capacity || 20);
    return Promise.resolve();
  },
  createIncomingPort: function createIncomingPort(name) {
    this.port = new IncomingPort(name);
    return Promise.resolve();
  },
  outConnectToIn: function outConnectToIn(remoteIPC, remotePort) {
    return this.port.connect(remoteIPC, remotePort);
  },
  inConnectToOut: function inConnectToOut(remoteIPC, remotePort) {
    return new Promise((resolve, reject) => {
      let retriesRemaining = 7;
      const checkForConnection = () => {
        if (retriesRemaining > 0) {
          retriesRemaining -= 1;
          if (this.port.isConnectedTo(remoteIPC, remotePort)) {
            resolve();
          } else {
            setTimeout(checkForConnection, 250);
          }
        } else {
          reject(new Error('Timeout waiting for back-connection'));
        }
      };
      checkForConnection();
    });
  },
  sendMessage: function sendMessage() {
    this.port.open();
    const message = new Message(42);
    return this.port.send(message);
  },
  receiveMessage: function receiveMessage() {
    return this.port.receive().then((messageObject) => {
      const message = Message.fromObject(messageObject);
      assert(message.contents === 42, 'Received the message that was expected');
    });
  },

  cleanup: function cleanup() {
    Object.keys(ipc.of).forEach(id => ipc.disconnect(id));
    if (ipc.server) {
      ipc.server.stop();
    }
  },
};

export default steps;
