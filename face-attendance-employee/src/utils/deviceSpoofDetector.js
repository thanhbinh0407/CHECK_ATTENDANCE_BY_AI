/**
 * Anti-spoof evidence evaluator.
 *
 * The system relies on the camera's circle gate (a minimum face-size /
 * distance requirement) to make handheld phone-spoof attacks impractical,
 * and on a small set of "is this a real face" signals collected per-frame
 * by the scanner component:
 *
 *   - `staticImage`   – temporal HF-correlation says the frames are static.
 *   - `lowLiveness`   – no blink / no head-movement.
 *   - `rectInside`    – rectangle / corner pattern detected INSIDE the
 *                       face circle but OUTSIDE the face bbox – i.e. a phone
 *                       bezel framing a displayed face.
 *   - `serverSpoof`   – server-side advanced anti-spoof verdict.
 *
 * NOTE: `lowAntiScore` (local texture) is no longer fed into the evaluator.
 * With the user-facing threshold pinned at 95 it would fire on virtually
 * every real frame; the corroborated `live + lowAnti` per-frame gate in
 * the scanner remains as a two-signal check.
 *
 * `evaluateSpoofEvidence` consumes a rolling buffer of those records and
 * decides whether to latch the spoof warning. The latch policy:
 *
 *   - A single HIGH-severity hit (static image, rectangle-inside-circle)
 *     latches immediately.
 *   - The server's "Screen / Print / Replay / Encoding / Compressed"
 *     verdict is downgraded to MID (the upstream model misfires on real
 *     faces, so it must corroborate before blocking).
 *   - Two corroborating MID signals on the SAME frame are promoted to HIGH.
 *   - >= 2 MID hits in the last 3 frames OR >= 4 MID hits in the last 6
 *     frames latch.
 */
export function evaluateSpoofEvidence(buffer, opts = {}) {
  const cleanFramesRequired = opts.cleanFramesRequired ?? 6;
  const recent = buffer.slice(-6);
  const veryRecent = buffer.slice(-3);

  let highInRecent = 0;
  let mediumInRecent = 0;
  let mediumInVeryRecent = 0;
  let primaryReason = null;
  let primaryBbox = null;

  for (let i = 0; i < recent.length; i++) {
    const ev = recent[i];
    if (!ev) continue;
    const isVeryRecent = i >= recent.length - veryRecent.length;
    let perFrameHighFrom = null;
    let perFrameBbox = null;

    if (ev.staticImage) {
      perFrameHighFrom = { reason: "static_image" };
    }
    if (!perFrameHighFrom && ev.rectInside && ev.rectInside.detected) {
      perFrameHighFrom = {
        reason: `rect_in_circle:${(ev.rectInside.reasons || []).join(",")}`,
      };
      perFrameBbox = ev.rectInside.suspectBbox || null;
    }

    // Server spoof verdict (Screen / Print / Replay / Encoding / Compressed)
    // is treated as MID severity, not HIGH. The third-party model misfires
    // on real faces, so it must corroborate with another MID signal (e.g.
    // lowLiveness, lowServerScore) before being promoted to HIGH below.
    const mids = [];
    if (ev.lowLiveness) mids.push("low_liveness");
    if (ev.serverSpoof && ev.serverSpoof.lowScore) mids.push("low_server_score");
    if (
      ev.serverSpoof &&
      ev.serverSpoof.spooType &&
      /Screen|Print|Replay|Encoding|Compressed/i.test(ev.serverSpoof.spooType)
    ) {
      mids.push(`server:${ev.serverSpoof.spooType}`);
    }

    if (!perFrameHighFrom && mids.length >= 2) {
      perFrameHighFrom = { reason: `${mids[0]}+${mids[1]}` };
    }

    if (perFrameHighFrom) {
      highInRecent++;
      if (!primaryReason) {
        primaryReason = perFrameHighFrom.reason;
        primaryBbox = perFrameBbox;
      }
    } else if (mids.length > 0) {
      mediumInRecent += mids.length;
      if (isVeryRecent) mediumInVeryRecent += mids.length;
      if (!primaryReason) primaryReason = mids[0];
    }
  }

  const block = highInRecent >= 1 || mediumInVeryRecent >= 2 || mediumInRecent >= 4;

  return {
    block,
    primaryReason,
    primaryBbox,
    primaryClass: null,
    highCount: highInRecent,
    mediumCount: mediumInRecent,
    mediumInVeryRecent,
    cleanFramesRequired,
  };
}
/**
 * Anti-spoof evidence evaluator.
 *
 * The system relies on the camera's circle gate (a minimum face-size /
 * distance requirement) to make handheld phone-spoof attacks impractical,
 * and on a small set of "is this a real face" signals collected per-frame
 * by the scanner component:
 *
 *   - `staticImage`   – temporal HF-correlation says the frames are static.
 *   - `lowLiveness`   – no blink / no head-movement.
 *   - `rectInside`    – rectangle / corner pattern detected INSIDE the
 *                       face circle but OUTSIDE the face bbox – i.e. a phone
 *                       bezel framing a displayed face.
 *   - `serverSpoof`   – server-side advanced anti-spoof verdict.
 *
 * NOTE: `lowAntiScore` (local texture) is no longer fed into the evaluator.
 * With the user-facing threshold pinned at 95 it would fire on virtually
 * every real frame; the corroborated `live + lowAnti` per-frame gate in
 * the scanner remains as a two-signal check.
 *
 * `evaluateSpoofEvidence` consumes a rolling buffer of those records and
 * decides whether to latch the spoof warning. The latch policy:
 *
 *   - A single HIGH-severity hit (static image, rectangle-inside-circle)
 *     latches immediately.
 *   - The server's "Screen / Print / Replay / Encoding / Compressed"
 *     verdict is downgraded to MID (the upstream model misfires on real
 *     faces, so it must corroborate before blocking).
 *   - Two corroborating MID signals on the SAME frame are promoted to HIGH.
 *   - >= 2 MID hits in the last 3 frames OR >= 4 MID hits in the last 6
 *     frames latch.
 */

export function evaluateSpoofEvidence(buffer, opts = {}) {
  const cleanFramesRequired = opts.cleanFramesRequired ?? 6;
  const recent = buffer.slice(-6);
  const veryRecent = buffer.slice(-3);

  let highInRecent = 0;
  let mediumInRecent = 0;
  let mediumInVeryRecent = 0;
  let primaryReason = null;
  let primaryBbox = null;

  for (let i = 0; i < recent.length; i++) {
    const ev = recent[i];
    if (!ev) continue;
    const isVeryRecent = i >= recent.length - veryRecent.length;
    let perFrameHighFrom = null;
    let perFrameBbox = null;

    if (ev.staticImage) {
      perFrameHighFrom = { reason: "static_image" };
    }
    if (!perFrameHighFrom && ev.rectInside && ev.rectInside.detected) {
      perFrameHighFrom = {
        reason: `rect_in_circle:${(ev.rectInside.reasons || []).join(",")}`,
      };
      perFrameBbox = ev.rectInside.suspectBbox || null;
    }

    // Server spoof verdict (Screen / Print / Replay / Encoding / Compressed)
    // is treated as MID severity, not HIGH. The third-party model misfires
    // on real faces, so it must corroborate with another MID signal (e.g.
    // lowLiveness, lowServerScore) before being promoted to HIGH below.
    const mids = [];
    if (ev.lowLiveness) mids.push("low_liveness");
    if (ev.serverSpoof && ev.serverSpoof.lowScore) mids.push("low_server_score");
    if (
      ev.serverSpoof &&
      ev.serverSpoof.spooType &&
      /Screen|Print|Replay|Encoding|Compressed/i.test(ev.serverSpoof.spooType)
    ) {
      mids.push(`server:${ev.serverSpoof.spooType}`);
    }

    if (!perFrameHighFrom && mids.length >= 2) {
      perFrameHighFrom = { reason: `${mids[0]}+${mids[1]}` };
    }

    if (perFrameHighFrom) {
      highInRecent++;
      if (!primaryReason) {
        primaryReason = perFrameHighFrom.reason;
        primaryBbox = perFrameBbox;
      }
    } else if (mids.length > 0) {
      mediumInRecent += mids.length;
      if (isVeryRecent) mediumInVeryRecent += mids.length;
      if (!primaryReason) primaryReason = mids[0];
    }
  }

  const block =
    highInRecent >= 1 || mediumInVeryRecent >= 2 || mediumInRecent >= 4;

  return {
    block,
    primaryReason,
    primaryBbox,
    primaryClass: null,
    highCount: highInRecent,
    mediumCount: mediumInRecent,
    mediumInVeryRecent,
    cleanFramesRequired,
  };
}
