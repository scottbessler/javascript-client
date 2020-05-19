import promiseWrapper from '../utils/promise/wrapper';
import logFactory from '../utils/logger';
const log = logFactory('');

const NEW_LISTENER_EVENT = 'newListener';
const REMOVE_LISTENER_EVENT = 'removeListener';

// default onRejected handler, that just logs the error, if ready promise doesn't have one.
function defaultOnRejected(err) {
  log.error(err);
}

/**
 * StatusManager factory. Responsable of:
 * - exposing public status event constants (SDK_READY, etc.), event emitter (gate), and ready promise.
 * - updating client context according to status events
 * - logging warnings and errors regarding user listeners of status events
 *
 * @param {Object} context client context
 * @param {number} internalReadyCbCount number of SDK_READY listeners that are added/removed internally
 */
export default function callbackHandlerContext(context, internalReadyCbCount = 0) {
  const gate = context.get(context.constants.READINESS).gate;
  let readyCbCount = 0;
  // @TODO remove isReady/hasTimedout, and access it from the context?
  let isReady = false;
  let hasTimedout = false;
  const {
    SDK_READY,
    SDK_READY_FROM_CACHE,
    SDK_UPDATE,
    SDK_READY_TIMED_OUT
  } = gate;

  gate.on(REMOVE_LISTENER_EVENT, event => {
    if (event === SDK_READY) readyCbCount--;
  });

  gate.on(NEW_LISTENER_EVENT, event => {
    if (event === SDK_READY || event === SDK_READY_TIMED_OUT) {
      if (isReady) {
        log.error(`A listener was added for ${event === SDK_READY ? 'SDK_READY' : 'SDK_READY_TIMED_OUT'} on the SDK, which has already fired and won't be emitted again. The callback won't be executed.`);
      } else if (event === SDK_READY) {
        readyCbCount++;
      }
    }
  });

  const readyPromise = generateReadyPromise();

  gate.once(SDK_READY_FROM_CACHE, () => {
    log.info('Split SDK is ready from cache.');

    context.put(context.constants.READY_FROM_CACHE, true);
  });

  function generateReadyPromise() {
    const promise = promiseWrapper(new Promise((resolve, reject) => {
      gate.once(SDK_READY, () => {
        if (readyCbCount === internalReadyCbCount && !promise.hasOnFulfilled()) log.warn('No listeners for SDK Readiness detected. Incorrect control treatments could have been logged if you called getTreatment/s while the SDK was not yet ready.');

        context.put(context.constants.READY, true);

        isReady = true;

        resolve();
      });
      // @TODO should we handle SDK_READY_FROM_CACHE here and resolve the promise in that case?
      gate.once(SDK_READY_TIMED_OUT, (error) => {
        // @TODO store hasTimedout in context
        hasTimedout = true;
        reject(error);
      });
    }), defaultOnRejected);

    return promise;
  }

  return Object.assign(
    // Expose Event Emitter functionality
    Object.create(gate),
    {
      // Expose the event constants without changing the interface
      Event: {
        SDK_READY,
        SDK_READY_FROM_CACHE,
        SDK_UPDATE,
        SDK_READY_TIMED_OUT,
      },
      // Expose the ready promise flag
      ready: () => {
        if (hasTimedout) {
          if (!isReady) {
            return promiseWrapper(Promise.reject('Split SDK has emitted SDK_READY_TIMED_OUT event.'), defaultOnRejected);
          } else {
            return Promise.resolve();
          }
        }
        return readyPromise;
      }
    }
  );
}