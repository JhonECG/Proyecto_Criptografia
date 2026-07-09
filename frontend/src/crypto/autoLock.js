const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "touchstart", "focus"];

// Starts an inactivity timer that calls onLock when the timeout elapses.
// Resets on any user activity. Returns a dispose function to cancel.
export function startAutoLock(timeoutMs, onLock) {
  let timer = null;

  function reset() {
    clearTimeout(timer);
    timer = setTimeout(onLock, timeoutMs);
  }

  ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, reset, true));
  reset();

  return function dispose() {
    clearTimeout(timer);
    ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, reset, true));
  };
}
