import { compilePresentation } from "./compiler.js";
import { createPresentationState, reducePresentationState } from "./reducer.js";

export class PresentationController extends EventTarget {
  constructor({ presentation, context = {}, initialIndex = 0, autoplay = false, compiled = null } = {}) {
    super();
    this.context = context;
    this.compiled = compiled?.timeline ? compiled : compilePresentation(presentation, context);
    this.state = createPresentationState(this.compiled, initialIndex);
    this.autoplay = Boolean(autoplay || this.compiled.presentation.settings.autoplay);
    this.continuousPlay = false;
    this.timer = null;
  }

  start(index = this.state.index < 0 ? 0 : this.state.index) {
    this.dispatch({ type: "START", index });
    return this.current();
  }

  next() {
    this.dispatch({ type: "NEXT" });
    return this.current();
  }

  previous() {
    this.dispatch({ type: "PREVIOUS" });
    return this.current();
  }

  goTo(index) {
    this.dispatch({ type: "GOTO", index });
    return this.current();
  }

  pause() {
    this.dispatch({ type: "PAUSE" });
  }

  resume() {
    this.dispatch({ type: "RESUME" });
    if (this.state.status === "playing") this.scheduleAutoplay(this.current());
  }

  toggleContinuousPlay() {
    this.setContinuousPlay(!this.continuousPlay);
  }

  setContinuousPlay(enabled) {
    this.continuousPlay = Boolean(enabled);
    if (this.continuousPlay) {
      if (this.state.status === "paused") this.resume();
      else if (this.state.status === "ready") this.start();
      else if (this.state.status === "complete") this.start(0);
      else this.scheduleAutoplay(this.current());
    } else if (this.state.status === "playing") {
      this.pause();
    }
    this.dispatchEvent(new CustomEvent("playbackchange", {
      detail: { playing: this.continuousPlay && this.state.status === "playing" }
    }));
  }

  explore() {
    this.dispatch({ type: "EXPLORE" });
  }

  resumeStory() {
    this.dispatch({ type: "RESUME_STORY" });
  }

  stop() {
    clearTimeout(this.timer);
    this.dispatch({ type: "CLOSE" });
  }

  current() {
    return this.state.index >= 0 ? this.compiled.timeline[this.state.index] || null : null;
  }

  dispatch(event) {
    clearTimeout(this.timer);
    const previous = this.state;
    this.state = reducePresentationState(this.state, event);
    const current = this.current();
    if (this.state.status === "complete" && previous.status !== "complete") {
      this.dispatchEvent(new CustomEvent("complete", { detail: { state: this.state } }));
    }
    if (current && (previous.index !== this.state.index || event.type === "START" || event.type === "RESUME_STORY")) {
      this.dispatchEvent(new CustomEvent("beatchange", { detail: { state: this.state, frame: current } }));
      this.scheduleAutoplay(current);
    }
    this.dispatchEvent(new CustomEvent("statechange", { detail: { state: this.state, frame: current, event } }));
    if (event.type === "CLOSE") this.dispatchEvent(new CustomEvent("stop", { detail: { state: this.state } }));
  }

  scheduleAutoplay(frame) {
    if ((!this.autoplay && !this.continuousPlay) || this.state.status !== "playing" || this.state.index >= this.state.total - 1) return;
    const duration = this.continuousPlay
      ? frame.durationMs
      : frame.beat.timing?.advance === "auto"
      ? frame.durationMs
      : frame.beat.timing?.advance === "manual" ? null : frame.durationMs;
    if (!duration) return;
    this.timer = setTimeout(() => this.next(), duration);
  }
}
