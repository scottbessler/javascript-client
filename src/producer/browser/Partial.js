/**
Copyright 2016 Split Software

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
**/

import TaskFactory from '../task';
import MySegmentsUpdater from '../updater/MySegments';
import onSplitsArrivedFactory from './onSplitsArrivedFactory';

/**
 * Incremental updater to be used to share data in the browser.
 */
const PartialBrowserProducer = (context) => {
  const settings = context.get(context.constants.SETTINGS);
  const { splits: splitsEventEmitter } = context.get(context.constants.READINESS);

  const mySegmentsUpdater = MySegmentsUpdater(context);
  const mySegmentsUpdaterTask = TaskFactory(synchronizeMySegments, settings.scheduler.segmentsRefreshRate);

  const onSplitsArrived = onSplitsArrivedFactory(mySegmentsUpdaterTask, context, isRunning);
  splitsEventEmitter.on(splitsEventEmitter.SDK_SPLITS_ARRIVED, onSplitsArrived);
  if (splitsEventEmitter.haveSplitsArrived()) onSplitsArrived();

  let isSynchronizingMySegments = false;

  /**
   * @param {string[] | undefined} segmentList might be undefined
   */
  function synchronizeMySegments(segmentList) {
    isSynchronizingMySegments = true;
    return mySegmentsUpdater(0, segmentList).finally(function () {
      isSynchronizingMySegments = false;
    });
  }

  let running = false;
  // we cannot rely on `mySegmentsUpdaterTask.isRunning` to check if doing polling
  function isRunning() {
    return running;
  }

  // for shared clients, we run it a first time to emit SDK_SEGMENTS_ARRIVED if splits were already fetched and don't use segments
  // onSplitsArrived();

  return {
    // Start periodic fetching (polling)
    start() {
      running = true;
      mySegmentsUpdaterTask.start();
    },

    // Stop periodic fetching (polling)
    stop() {
      running = false;
      mySegmentsUpdaterTask.stop();
    },

    // Used by SyncManager to know if running in polling mode.
    isRunning,

    // Used by MySegmentUpdateWorker
    isSynchronizingMySegments() {
      return isSynchronizingMySegments;
    },
    synchronizeMySegments,
  };
};

export default PartialBrowserProducer;