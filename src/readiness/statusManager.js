import objectAssign from 'object-assign';
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
 * StatusManager factory.
 * Responsable of exposing public status API: ready promise, event emitter and constants (SDK_READY, etc).
 * It also updates client context according to status events and logs related warnings and errors.
 *
 * @param {Object} context client context
 * @param {number} internalReadyCbCount offset value of SDK_READY listeners that are added/removed internally
 * by the SDK. It is required to properly log the warning 'No listeners for SDK Readiness detected'
 */
export default function callbackHandlerContext(context, internalReadyCbCount = 0) {
  const gate = context.get(context.constants.READINESS).gate;
  let readyCbCount = 0;
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
        log.info('Split SDK is ready.');

        if (readyCbCount === internalReadyCbCount && !promise.hasOnFulfilled()) log.warn('No listeners for SDK Readiness detected. Incorrect control treatments could have been logged if you called getTreatment/s while the SDK was not yet ready.');
        context.put(context.constants.READY, true);
        isReady = true;
        resolve();
      });
      gate.once(SDK_READY_TIMED_OUT, (error) => {
        context.put(context.constants.HAS_TIMEDOUT, true);
        hasTimedout = true;
        reject(error);
      });
    }), defaultOnRejected);

    return promise;
  }

  return objectAssign(
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
      /**
       * Returns a promise that will be resolved once the SDK has finished loading (SDK_READY event emitted) or rejected if the SDK has timedout (SDK_READY_TIMED_OUT event emitted).
       * As it's meant to provide similar flexibility to the event approach, given that the SDK might be eventually ready after a timeout event, calling the `ready` method after the
       * SDK had timed out will return a new promise that should eventually resolve if the SDK gets ready.
       *
       * Caveats: the method was designed to avoid an unhandled Promise rejection if the rejection case is not handled, so that `onRejected` handler is optional when using promises.
       * However, when using async/await syntax, the rejection should be explicitly propagated like in the following example:
       * ```
       * try {
       *   await client.ready().catch((e) => { throw e; });
       *   // SDK is ready
       * } catch(e) {
       *   // SDK has timedout
       * }
       * ```
       *
       * @function ready
       * @returns {Promise<void>}
       */
      ready: () => {
        if (hasTimedout) {
          if (!isReady) {
            return promiseWrapper(Promise.reject('Split SDK has emitted SDK_READY_TIMED_OUT event.'), defaultOnRejected);
          } else {
            return Promise.resolve();
          }
        }
        return readyPromise;
      },
      // Expose context for internal purposes only. Not considered part of the public API, and will be removed eventually.
      __context: context
    }
  );
}