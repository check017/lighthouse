/**
 * @license Copyright 2020 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {Omit<LH.TraceEvent, 'name'|'args'> & {name: 'LayoutShift', args: {data: {score: number, weighted_score_delta: number, had_recent_input: boolean}}}} LayoutShiftEvent */

const makeComputedArtifact = require('../computed-artifact.js');
const TraceOfTab = require('../trace-of-tab.js');
const LHError = require('../../lib/lh-error.js');

class CumulativeLayoutShiftAllFrames {
  /**
   * @param {LH.TraceEvent} event
   * @return {event is LayoutShiftEvent}
   */
  static isLayoutShiftEvent(event) {
    if (
      event.name !== 'LayoutShift' ||
      !event.args ||
      !event.args.data ||
      !event.args.data.score ||
      event.args.data.had_recent_input
    ) return false;

    // Weighted score was added to the trace in m89:
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1173139
    if (typeof event.args.data.weighted_score_delta !== 'number') {
      throw new LHError(
        LHError.errors.UNSUPPORTED_OLD_CHROME,
        {featureName: 'Cumulative Layout Shift All Frames'}
      );
    }

    return true;
  }

  /**
   * @param {LH.Trace} trace
   * @param {LH.Audit.Context} context
   * @return {Promise<{value: number}>}
   */
  static async compute_(trace, context) {
    const traceOfTab = await TraceOfTab.request(trace, context);
    const cumulativeShift = traceOfTab.frameTreeEvents
      .filter(this.isLayoutShiftEvent)
      .map(e => e.args.data.weighted_score_delta)
      .reduce((sum, score) => sum + score, 0);
    return {
      value: cumulativeShift,
    };
  }
}

module.exports = makeComputedArtifact(CumulativeLayoutShiftAllFrames);
