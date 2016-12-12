import { fork } from 'child_process';
import { EventEmitter } from 'events';
// import Promise from 'bluebird';

class RemoteRig extends EventEmitter {
  constructor(name) {
    super();
    this.name = name;
    this.rig = fork('./tests/TestRig.js', [name]);
  }

  startStep(step) {
    step.once('startStep', e => this.emit('startStep', e));
    step.once('completeStep', e => this.emit('completeStep', e));

    if (step.process !== this.name) {
      throw new Error(`Step '${step.id} passed to this process (${this.name}) 
        instead of ${step.process}`);
    }
    if (this.currentStep) {
      this.currentStep = this.currentStep.then(step.getStarter(this));
    } else {
      this.currentStep = step.start(this);
    }
    return this.currentStep;
  }

  reset() {
    delete this.currentStep;
    this.rig.send({ type: 'reset' });
  }

  disconnect() {
    this.reset();
    this.rig.disconnect();
  }
}

export default RemoteRig;
