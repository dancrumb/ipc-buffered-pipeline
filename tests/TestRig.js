import testSteps from './testSteps';

let context = {};

function resetRig() {
  testSteps.cleanup.call(context);
  context = {};
}


const reportError = (e) => {
  process.send({ type: 'error', details: `${e.name}: ${e.message}` });
};

process.on('message', (message) => {
  const stepName = message.type;
  if (stepName === 'reset') {
    return resetRig();
  }

  const step = testSteps[stepName];
  if (!step) {
    process.send({ type: 'error', details: `Step '${stepName}' does not exist` });
  } else {
    try {
      let stepP;
      if (message.args) {
        stepP = step.call(context, ...message.args);
      } else {
        stepP = step.call(context);
      }

      stepP
        .then(() => process.send({ type: 'done', id: message.id }))
        .catch(reportError);
    } catch (e) {
      reportError(e);
    }
  }
  return null;
});

process.on('disconnect', () => {
  testSteps.cleanup.call(context);
  context = {};
});

context.name = process.argv[2] || 'Unamed';
