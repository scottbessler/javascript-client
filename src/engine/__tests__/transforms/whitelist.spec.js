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
import tape from 'tape-catch';
import transform from '../../transforms/whitelist';

tape('TRANSFORMS / a whitelist Array should be casted into a Set', function (assert) {
  let sample = {
    whitelist: [
      'u1',
      'u2',
      'u3'
    ]
  };

  let sampleSet = transform(sample);

  sample.whitelist.forEach(item => {
    if (!sampleSet.has(item)) {
      assert.fail(`Missing item ${item}`);
    }
  });

  sampleSet = transform({});
  assert.equal(sampleSet.size, 0, 'Empty Set if passed an object without a whitelist');

  assert.ok(true, 'Everything looks fine');
  assert.end();
});