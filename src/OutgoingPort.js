import Promise from 'bluebird';
import Port from './Port';
import OutgoingStream from './OutgoingStream';

function trySend(message, resolve) {
  message.release();
  if (this.stream.write(message)) {
    resolve();
  } else {
    this.stream.once('drain', trySend.bind(this, message, resolve));
  }
}

/**
 * @extends Port
 */
class OutgoingPort extends Port {
  constructor(portName, capacity = 20) {
    super(portName);

    this.stream = new OutgoingStream(null, portName, capacity);
  }

  /**
   *
   * @param message {Message}
   *
   * @returns {Promise} resolved once the `message` has been passed on
   */
  send(message) {
    return new Promise((resolve, reject) => {
      if (!this.isOpen()) {
        reject(new Error('Cannot send an IP via a closed port'));
      } else if (!this.stream.isConnected) {
        reject(new Error('Cannot send an IP without a connection to send it on'));
      } else if (message.owner !== this.ipcId) {
        reject(new Error('Trying to send message that is not owned by this process'));
      } else {
        trySend.call(this, message, resolve);
      }
    });
  }

  /**
   * @returns {Number} the number of messages waiting to be sent
   */
  getPendingMessageCount() {
    return this.stream.pendingMessageCount();
  }

  connect(remoteProcess, remotePort) {
    return this.stream.connect(remoteProcess, remotePort);
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
