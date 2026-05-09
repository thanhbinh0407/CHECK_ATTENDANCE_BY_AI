/**
 * Rolling-buffer evaluator for kiosk spoof evidence.
 * Consumed by AttendanceScanner.pushEvidenceAndEvaluate.
 *
 * @typedef {object} ServerSpoofSlice
 * @property {string} [spooType]
 * @property {boolean} [isReal]
 * @property {number} [score]
 * @property {boolean} [lowScore]
 *
 * @typedef {object} RectInsideSlice
 * @property {boolean} detected
 * @property {string[]} [reasons]
 * @property {{x:number,y:number,width:number,height:number}|null} [suspectBbox]
 *
 * @typedef {object} FrameEvidence
 * @property {number} timestamp
 * @property {boolean} staticImage
 * @property {boolean} lowLiveness
 * @property {RectInsideSlice|null|undefined} rectInside
 * @property {ServerSpoofSlice|null|undefined} serverSpoof
 *
 * @typedef {object} SpoofDecision
 * @property {boolean} block
 * @property {number} highCount
 * @property {number} mediumCount
 * @property {string|null} [primaryReason]
 * @property {{x:number,y:number,width:number,height:number}|null|undefined} [primaryBbox]
 */

const SERVER_SPOOF_TYPE_RE = /Screen|Print|Replay|Encoding|Compressed/i;

function frameHigh(ev) {
  return !!ev.staticImage || !!(ev.rectInside && ev.rectInside.detected);
}

function frameMedium(ev) {
  const serverBad =
    ev.serverSpoof &&
    (ev.serverSpoof.lowScore ||
      SERVER_SPOOF_TYPE_RE.test(ev.serverSpoof.spooType || ""));
  return !!ev.lowLiveness || !!serverBad;
}

function pickPrimaryFromBuffer(buffer) {
  for (let i = buffer.length - 1; i >= 0; i--) {
    const ev = buffer[i];
    if (ev.staticImage) {
      return { primaryReason: "static_image", primaryBbox: null };
    }
    if (ev.rectInside && ev.rectInside.detected) {
      return {
        primaryReason: "device_frame",
        primaryBbox: ev.rectInside.suspectBbox || null,
      };
    }
  }
  for (let i = buffer.length - 1; i >= 0; i--) {
    const ev = buffer[i];
    if (!frameMedium(ev)) continue;
    if (ev.serverSpoof && SERVER_SPOOF_TYPE_RE.test(ev.serverSpoof.spooType || "")) {
      return { primaryReason: "server_spoof", primaryBbox: null };
    }
    if (ev.serverSpoof && ev.serverSpoof.lowScore) {
      return { primaryReason: "server_low_score", primaryBbox: null };
    }
    if (ev.lowLiveness) {
      return { primaryReason: "low_liveness", primaryBbox: null };
    }
  }
  return { primaryReason: "spoof_signals", primaryBbox: null };
}

/**
 * @param {FrameEvidence[]} buffer
 * @param {{ cleanFramesRequired?: number }} [options]
 * @returns {SpoofDecision}
 */
export function evaluateSpoofEvidence(buffer, options = {}) {
  void options.cleanFramesRequired;

  if (!Array.isArray(buffer) || buffer.length === 0) {
    return { block: false, highCount: 0, mediumCount: 0 };
  }

  let highCount = 0;
  let mediumCount = 0;
  for (const ev of buffer) {
    if (frameHigh(ev)) highCount += 1;
    if (frameMedium(ev)) mediumCount += 1;
  }

  const last = buffer[buffer.length - 1];
  const lastHigh = frameHigh(last);

  const block =
    lastHigh ||
    highCount >= 2 ||
    (highCount >= 1 && mediumCount >= 4);

  if (!block) {
    return { block: false, highCount, mediumCount };
  }

  const { primaryReason, primaryBbox } = pickPrimaryFromBuffer(buffer);
  return {
    block: true,
    highCount,
    mediumCount,
    primaryReason,
    primaryBbox,
  };
}
