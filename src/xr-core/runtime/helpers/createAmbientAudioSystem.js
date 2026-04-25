import * as THREE from "three";

export function createAmbientAudioSystem({
  camera,
  getMood,
  seaUrl = "/audio/sea-1.mp3",
  forestUrl = "/audio/forest-1.mp3",
  seaBaseVolume = 0.22,
  forestBaseVolume = 0.18,
}) {
  let listener = null;
  let seaAudio = null;
  let forestAudio = null;
  let audioReady = false;
  let audioStarted = false;

  const init = () => {
    if (audioReady) return;

    listener = new THREE.AudioListener();
    camera.add(listener);

    const loader = new THREE.AudioLoader();

    seaAudio = new THREE.Audio(listener);
    forestAudio = new THREE.Audio(listener);

    loader.load(seaUrl, (buffer) => {
      seaAudio.setBuffer(buffer);
      seaAudio.setLoop(true);
      seaAudio.setVolume(0.0);
    });

    loader.load(forestUrl, (buffer) => {
      forestAudio.setBuffer(buffer);
      forestAudio.setLoop(true);
      forestAudio.setVolume(0.0);
    });

    audioReady = true;
  };

  const start = () => {
    if (!audioReady || audioStarted) return;
    if (!seaAudio?.buffer || !forestAudio?.buffer) return;

    try {
      if (!seaAudio.isPlaying) seaAudio.play();
      if (!forestAudio.isPlaying) forestAudio.play();
      audioStarted = true;
    } catch {}
  };

  const update = () => {
    if (!audioStarted || !seaAudio || !forestAudio) return;

    const mood = typeof getMood === "function" ? getMood() : 0;
    const safeMood = Math.max(0, Math.min(1, Number.isFinite(mood) ? mood : 0));

    seaAudio.setVolume((1 - safeMood) * seaBaseVolume);
    forestAudio.setVolume(safeMood * forestBaseVolume);
  };

  const dispose = () => {
    try {
      if (seaAudio?.isPlaying) seaAudio.stop();
      if (forestAudio?.isPlaying) forestAudio.stop();
    } catch {}

    try {
      if (listener) camera.remove(listener);
    } catch {}

    listener = null;
    seaAudio = null;
    forestAudio = null;
    audioReady = false;
    audioStarted = false;
  };

  return {
    init,
    start,
    update,
    dispose,
  };
}
