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
import base, { noCacheExtraHeader } from '../request';
import { matching } from '../../utils/key/factory';

export default function GET(settings, noCache) {
  /**
   * URI encoding of user keys in order to:
   *  - avoid 400 responses (due to URI malformed). E.g.: '/api/mySegments/%'
   *  - avoid 404 responses. E.g.: '/api/mySegments/foo/bar'
   *  - match user keys with special characters. E.g.: 'foo%bar', 'foo/bar'
   */
  return base(settings, `/mySegments/${encodeURIComponent(matching(settings.core.key))}`, undefined, noCache ? noCacheExtraHeader : undefined);
}