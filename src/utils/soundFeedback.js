/**
 * Audio Beep & Haptic Vibration Feedback for Successful OCR Detection
 */
export function triggerSuccessFeedback() {
  // 1. Haptic Vibration (Mobile Browsers)
  if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
    try {
      navigator.vibrate([100, 50, 100]);
    } catch (e) {
      // Ignore if not permitted
    }
  }

  // 2. Web Audio API Beep Tone (880Hz crisp beep)
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    }
  } catch (e) {
    // Ignore audio context autoplay restrictions
  }
}
