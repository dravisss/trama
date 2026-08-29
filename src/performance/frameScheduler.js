export function createFrameScheduler(callback) {
  let frame = null;
  let latest = undefined;

  const flush = () => {
    frame = null;
    const value = latest;
    latest = undefined;
    callback(value);
  };

  return {
    schedule(value) {
      latest = value;
      if (frame === null) frame = requestAnimationFrame(flush);
      return frame;
    },
    cancel() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      latest = undefined;
    },
    get pending() {
      return frame !== null;
    }
  };
}
