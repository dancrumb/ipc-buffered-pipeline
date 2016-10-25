import FIFO from 'event-emitting-fifo';

class OutgoingPort {
  constructor(ipcId, capacity) {
    this.ipcId = ipcId;
    this.queue = new FIFO();
    this.capacity = capacity || 20;
  }


}

export default OutgoingPort;
