// @flow

'use strict';

const thenable = require('../utils/promise/thenable');

/**
 * @NOTE The backend sometimes doesn't answer the list of partitions correctly,
 *       so we need to build it mixing the list of partitions plus the default
 *       treatment.
 */
const fixMissingTreatment = (splitObject: SplitObject): Array<string> => {
  const treatments = splitObject.conditions[0].partitions.map(v => v.treatment);

  if (treatments.indexOf(splitObject.defaultTreatment) === -1) {
    treatments.push(splitObject.defaultTreatment);
  }

  return treatments;
};

const ObjectToView = (json: string): SplitView => {
  const splitObject: SplitObject = JSON.parse(json);

  return {
    name: splitObject.name,
    trafficType: splitObject.trafficTypeName,
    killed: splitObject.killed,
    changeNumber: splitObject.changeNumber,
    treatments: fixMissingTreatment(splitObject)
  };
};

const ObjectsToViews = (jsons: Array<string>): Array<SplitView> => {
  let views = [];

  for (let split of jsons) {
    views.push(ObjectToView(split));
  }

  return views;
};

const SplitManagerFactory = (splits: SplitCache): SplitManager => {

  return {
    split(splitName: string): ?SplitView {
      const split = splits.getSplit(splitName);

      if (split) {
        if (thenable(split)) return split.then(result => ObjectToView(result));
        return ObjectToView(split);
      } else {
        return null;
      }
    },

    splits(): Array<SplitView> {
      const els = [];
      const currentSplits = splits.getAll();

      if (thenable(currentSplits)) return currentSplits.then(ObjectsToViews);
      return ObjectsToViews(currentSplits);
    },

    names(): Array<string> {
      return splits.getKeys();
    }
  };

};

module.exports = SplitManagerFactory;
