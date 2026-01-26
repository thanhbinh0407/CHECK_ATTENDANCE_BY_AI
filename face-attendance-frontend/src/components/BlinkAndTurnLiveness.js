/**
 * Very lightweight liveness heuristic:
 * - Blink: compare EAR (eye aspect ratio) of left/right eye landmarks.
 * - Turn: check nose vs eyes x-position deltas.
 * This is demo-only and not robust for production.
 */
export function detectBlinkAndTurn(landmarks) {
  if (!landmarks) return { blink: false, turn: false };

  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();
  const nose = landmarks.getNose();

  const ear = (eye) => {
    const [p1, p2, p3, p4, p5, p6] = eye;
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    return (
      (dist(p2, p6) + dist(p3, p5)) /
      (2.0 * dist(p1, p4) || 1)
    );
  };

  const leftEAR = ear(leftEye);
  const rightEAR = ear(rightEye);
  const BLINK_THRESHOLD = 0.22;
  const blink = leftEAR < BLINK_THRESHOLD || rightEAR < BLINK_THRESHOLD;

  // simple head turn check: nose x vs eyes center x
  const leftEyeCenterX = (leftEye[0].x + leftEye[3].x) / 2;
  const rightEyeCenterX = (rightEye[0].x + rightEye[3].x) / 2;
  const eyesCenterX = (leftEyeCenterX + rightEyeCenterX) / 2;
  const noseX = nose[3]?.x ?? nose[0]?.x ?? eyesCenterX;
  const TURN_THRESHOLD = 12; // pixels
  const turn = Math.abs(noseX - eyesCenterX) > TURN_THRESHOLD;

  return {
    blink,
    turn,
    leftEAR,
    rightEAR
  };
}



