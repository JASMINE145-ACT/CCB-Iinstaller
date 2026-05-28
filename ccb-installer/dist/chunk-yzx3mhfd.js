// @bun
import {
  __esm,
  __require
} from "./chunk-qp2qdcda.js";

// packages/audio-capture-napi/src/index.ts
function loadModule() {
  if (loadAttempted) {
    return cachedModule;
  }
  loadAttempted = true;
  const platform = process.platform;
  if (platform !== "darwin" && platform !== "linux" && platform !== "win32") {
    return null;
  }
  if (process.env.AUDIO_CAPTURE_NODE_PATH) {
    try {
      cachedModule = __require(process.env.AUDIO_CAPTURE_NODE_PATH);
      return cachedModule;
    } catch {}
  }
  const platformDir = `${process.arch}-${platform}`;
  const fallbacks = [
    `./vendor/audio-capture/${platformDir}/audio-capture.node`,
    `../audio-capture/${platformDir}/audio-capture.node`,
    `${process.cwd()}/vendor/audio-capture/${platformDir}/audio-capture.node`
  ];
  for (const p of fallbacks) {
    try {
      cachedModule = __require(p);
      return cachedModule;
    } catch {}
  }
  return null;
}
function isNativeAudioAvailable() {
  return loadModule() !== null;
}
function startNativeRecording(onData, onEnd) {
  const mod = loadModule();
  if (!mod) {
    return false;
  }
  return mod.startRecording(onData, onEnd);
}
function stopNativeRecording() {
  const mod = loadModule();
  if (!mod) {
    return;
  }
  mod.stopRecording();
}
function isNativeRecordingActive() {
  const mod = loadModule();
  if (!mod) {
    return false;
  }
  return mod.isRecording();
}
function startNativePlayback(sampleRate, channels) {
  const mod = loadModule();
  if (!mod) {
    return false;
  }
  return mod.startPlayback(sampleRate, channels);
}
function writeNativePlaybackData(data) {
  const mod = loadModule();
  if (!mod) {
    return;
  }
  mod.writePlaybackData(data);
}
function stopNativePlayback() {
  const mod = loadModule();
  if (!mod) {
    return;
  }
  mod.stopPlayback();
}
function isNativePlaying() {
  const mod = loadModule();
  if (!mod) {
    return false;
  }
  return mod.isPlaying();
}
function microphoneAuthorizationStatus() {
  const mod = loadModule();
  if (!mod || !mod.microphoneAuthorizationStatus) {
    return 0;
  }
  return mod.microphoneAuthorizationStatus();
}
var cachedModule = null, loadAttempted = false;
var init_src = () => {};
init_src();

export {
  writeNativePlaybackData,
  stopNativeRecording,
  stopNativePlayback,
  startNativeRecording,
  startNativePlayback,
  microphoneAuthorizationStatus,
  isNativeRecordingActive,
  isNativePlaying,
  isNativeAudioAvailable
};
