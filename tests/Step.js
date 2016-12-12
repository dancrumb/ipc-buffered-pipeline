/**
 * Created by danrumney on 11/30/16.
 */
import Promise from 'bluebird';
import { EventEmitter } from 'events';


function getRigCompletion(rig, id) {
  return new Promise((resolve, reject) => {
    rig.once('message', (message) => {
      if (message.type === 'done') {
        if (message.id === id) {
          resolve(message.payload);
        }
      } else if (message.type === 'error') {
        console.log(`Error thrown by ${id}`);
        reject(new Error(message.details));
      } else {
        reject(new Error(`Unknown response from TestRig: ${message}`));
      }
    });
  });
}

class Step extends EventEmitter {
  constructor(options = {}) {
    super();

    this.id = options.id;
    this.process = options.process;
    this.method = options.method;
    this.args = options.args || [];
    this.cannotCompleteBefore = options.cannotCompleteBefore;
    this.cannotStartBefore = options.cannotStartBefore;

    this.dependantSteps = [];
    this.started = false;
    this.completed = false;
  }

  start(processInfo) {
    const id = this.id;
    const rig = processInfo.rig;
    if (this.started) {
      throw new Error(`Tried to start ${id}, but it has already been started`);
    }

    this.started = true;
    this.emit('startStep', { id, promise: this.promise });

    this.promise = getRigCompletion(rig, id);
    if (!this.cannotCompleteBefore) {
      this.promise = this.promise.timeout(2000, `Step ${id} timed out`);
    }

    this.promise = this.promise.then(() => {
      this.complete();
    });

    rig.send({ id, type: this.method, args: this.args || [] });

    return this.promise;
  }

  getStarter(processInfo) {
    // const processInfo = processes[step.process];
    return () => this.start(processInfo);
  }

  complete() {
    const id = this.id;
    if (!this.started) {
      throw new Error(`Tried to complete ${id}, but it has not been started`);
    }
    if (this.completed) {
      throw new Error(`Tried to complete ${id}, but it has already been completed`);
    }
    this.emit('completeStep', { id });
  }

  reset() {
    this.started = false;
    this.completed = false;
    this.dependantSteps = [];
    delete this.promise;
  }

  then(fn) {
    if (this.completed) {
      return this.promise.then(fn);
    }

    return new Promise((resolve) => {
      this.on('completeStep', () => {
        resolve(this.promise.then(fn));
      });
    });
  }

}

export default Step;
