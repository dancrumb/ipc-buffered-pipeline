import { EventEmitter } from 'events';
import _ from 'lodash';
import ipc from 'node-ipc';
import Promise from 'bluebird';

/**
 * A Port that makes up one end of the IPC Buffered Pipeline
 *
 * @extends EventEmitter
 */
class Port extends EventEmitter {

  /**
   * A Port should not be constructed until `ipc.config.id` has been set (the name of the owning
   * process). Also, once a port has been created, the name of the owning process cannot be changed.
   *
   * @param name The name of the port
   */
  constructor(name) {
    super();
    this.name = name;
    this.ipcId = ipc.config.id;

    ipc.server.on(`connect:${this.name}`, (data) => {
      // console.log('Connection Request: ', data);
      this.emit('connectionRequest', data);
    });

    this.portIsOpen = false;
    this.connections = {};
  }

  /**
   * Opens the port for traffic
   */
  open() {
    this.portIsOpen = true;
  }

  /**
   * Closes the port for traffic. This also signals to connected Ports that this port is closing.
   */
  close() {
    this.portIsOpen = false;
    _.forEach(this.connections, (remotePort) => {
      remotePort.ipc.emit('close', { port: this.name, ipcId: this.ipcId });
    });
  }

  /**
   *
   * @returns {boolean}
   */
  isOpen() {
    return this.portIsOpen;
  }

  /**
   *
   * Connects this port to another one as indicated by the `ipcId` and the `port` name.
   *
   * @param ipcId {string}
   * @param port {string}
   *
   * @returns {Promise} A Promise that resolves to the newly created connection
   * @throws {Error} If this port is already connected to the indicated port and Error is thrown
   */
  connect(ipcId, port) {
    // console.log(`Attempting to create connection to ${ipcId}.${port}`);

    if (this.connections[ipcId] && this.connections[ipcId][port]) {
      throw new Error(`Tried to connect to a Port (${ipcId}.${port}) that is already connected`);
    }

    if (!this.connections[ipcId]) {
      this.connections[ipcId] = {};
    }

    return new Promise((resolve) => {
      ipc.connectTo(ipcId, () => {
        this.connections[ipcId][port] = {
          ipcId,
          port,
          ipc: ipc.of[ipcId],
        };

        ipc.of[ipcId].emit(`connect:${port}`, { ipcId: this.ipcId, port: this.name });
        // console.log('Connecting successful');
        resolve(this.connections[ipcId][port]);
      });
    });
  }

  isConnectedTo(ipcId, port) {
    return this.connections[ipcId] && port in this.connections[ipcId];
  }

}

export default Port;
