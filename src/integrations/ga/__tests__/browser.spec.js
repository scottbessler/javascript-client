import tape from 'tape-catch';
import sinon from 'sinon';
import { SplitTracker, defaultOptions } from '../splitTracker';


function generateGaAndTrackerMock() {

  const model = {
    get: sinon.fake(function () { return undefined; })
  };

  const __originalSendHitTask = sinon.spy();
  const __tasks = {
    sendHitTask: __originalSendHitTask
  };
  const ga = function (command) {
    if (command === 'send') {
      __tasks.sendHitTask(model);
    }
  };

  const set = sinon.fake(function (taskName, taskFunc) {
    __tasks[taskName] = taskFunc;
  });
  const get = sinon.fake(function (taskName) {
    return __tasks[taskName];
  });
  return {
    ga,
    tracker: {
      get,
      set,
      __originalSendHitTask,
    }
  };
}


tape('splitTracker overwrites sendHitTask but calls original one', function (assert) {
  const { ga, tracker } = generateGaAndTrackerMock();

  defaultOptions.eventHandler = sinon.spy();

  new SplitTracker(tracker);

  const numberOfHitsToSend = 5;
  for (var i = 0; i < numberOfHitsToSend; i++)
    ga('send');

  assert.equal(tracker.__originalSendHitTask.callCount, numberOfHitsToSend, `original sendHitTask must be invoked ${numberOfHitsToSend} times`);
  assert.equal(defaultOptions.eventHandler.callCount, numberOfHitsToSend, `eventHandler must be invoked ${numberOfHitsToSend} times`);

  assert.end();

});