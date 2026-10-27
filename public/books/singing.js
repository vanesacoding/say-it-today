/* A time-indexed timeline: seeking always derives the page from media.currentTime. */
(() => {
  'use strict';
  function validate(cues, pageCount, duration) {
    return Array.isArray(cues) && cues.length > 0 && cues.every((cue, i) =>
      Number.isFinite(cue.at) && cue.at >= 0 && cue.at < duration &&
      Number.isInteger(cue.page) && cue.page >= -1 && cue.page < pageCount &&
      (i === 0 || cue.at > cues[i - 1].at));
  }
  function pageAt(cues, time) {
    if (!cues?.length || !Number.isFinite(time)) return -1;
    let lo = 0, hi = cues.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (cues[mid].at <= time) lo = mid + 1;
      else hi = mid;
    }
    return lo ? cues[lo - 1].page : -1;
  }
  window.JiguSinging = Object.freeze({validate, pageAt});
})();
