/**
 * Created by danrumney on 11/24/16.
 */
import Promise from 'bluebird';
import _ from 'lodash';
import generatePermutations from './RuleBasedPermuter';
import Step from './Step';
import RemoteRig from './RemoteRig';
import config from './configuration.json';

const steps = config.steps.map(step => new Step(step));

const rules = config.rules.map(rule =>
  (val, current) =>
    val.id !== rule[0] || _.find(current, { id: rule[1] })

);

const testcases = generatePermutations(steps, rules).map(permutation => permutation.selection);

const remoteRigs = {
  A: new RemoteRig('A'),
  B: new RemoteRig('B'),
};

_.forEach(remoteRigs, (remoteRig) => {
  remoteRig.on('startStep', e => console.log(`Start: ${e.id}`));
  remoteRig.on('completeStep', e => console.log(`End: ${e.id}`));
});

const getStep = stepId => _.find(steps, { id: stepId });

const testcaseGenerator = function testcaseGenerator(testSteps) {
  return function testcasePromise() {
    return testSteps.reduce((priorSteps, step) =>
        priorSteps
          .then(() => {
            const remoteRig = remoteRigs[step.process];
            const rigPromise = remoteRig.startStep(step);
            if (step.cannotCompleteBefore) {
              const controllingStep = getStep(step.cannotCompleteBefore);
              if (!controllingStep.completed) {
                controllingStep.dependantSteps.push(step);
                return Promise.resolve();
              }
            }

            if (step.dependantSteps.length > 0) {
              return Promise.all(_.map(step.dependantSteps, 'promise').concat(rigPromise));
            }

            return rigPromise;
          })
          .catch(Promise.TimeoutError, (e) => {
            throw e;
          })
          .catch((error) => {
            throw error;
          })
      , Promise.resolve()
    );
  };
};

const testSuite = testcases.reduce((priorTestCases, testcase, index) =>
    priorTestCases
      .then(() => {
        console.log(`Test ${index}\n-----${'-'.repeat((index.toString()).length)}`);
        console.log(_.map(testcase, 'id'));
      })
      .then(testcaseGenerator(testcase))
      .then(() =>
        Promise.all(steps.map(step => step.promise)).timeout(1000, 'Some step didn\'t complete')
      )
      .then(() => {
        _.invokeMap(remoteRigs, 'reset');
        _.invokeMap(steps, 'reset');
      })
  , Promise.resolve());

testSuite
  .catch((e) => {
    console.log(`${e.name}: ${e.message}`);
  })
  .finally(() => {
    _.invokeMap(remoteRigs, 'disconnect');
  });
