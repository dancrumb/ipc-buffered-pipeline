import FIFO from 'event-emitting-fifo';
import ipc from 'node-ipc';
import Promise from 'bluebird';
import _ from 'lodash';
import Port from './Port';
import Message from './Message';

/**
 * @extends Port
 */
class IncomingPort extends Port {
  constructor(name) {
    super(name);

    this.portsWithMessages = new FIFO();

    ipc.server.on('messageAvailable', (data) => {
      if (!_.has(this.connections, `${data.ipcId}.${data.port}`)) {
        throw new Error(`Receive notification from an unconnected port: ${data.ipcId}.${data.port}`);
      }

      this.portsWithMessages.enqueue({ ipcId: data.ipcId, port: data.port });
    });

    this.on('connectionRequest', (data) => {
      this.connect(data.ipcId, data.port);
    });
  }

  /**
   * @returns {Promise} a message
   */
  receive() {
    const portsWithMessages = this.portsWithMessages;

    const messageRequester = {
      request: function request() {
        const remote = portsWithMessages.dequeue();
        ipc.of[remote.ipcId].emit(`messageRequested:${remote.port}`);

        ipc.of[remote.ipcId].on('message', (messageObject) => {
          const message = Message.fromObject(messageObject);
          if (message.isOwned()) {
            this.reject(new Error(`Received message with an owner: ${message.owner}`));
          }
          this.resolve(message);
        });
      },
    };

    const message = new Promise((resolve, reject) => {
      messageRequester.resolve = resolve;
      messageRequester.reject = reject;
    });

    if (portsWithMessages.isEmpty()) {
      portsWithMessages.once('valueAdded', messageRequester.request.bind(messageRequester));
    } else {
      messageRequester.request();
    }

    return message;
  }

  close() {
    this.queue.reset();

    super.close();
  }
}

export default IncomingPort;
