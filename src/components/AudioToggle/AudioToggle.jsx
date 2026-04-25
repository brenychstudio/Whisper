import { useEffect, useRef, useState } from "react";
import { site } from "../../content/config.js";
import styles from "./AudioToggle.module.css";

export default function AudioToggle() {
  const audioRef = useRef(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!site.audio?.src) return;
    audioRef.current = new Audio(site.audio.src);
    audioRef.current.loop = true;
    audioRef.current.preload = "none";
    return () => {
      try { audioRef.current?.pause(); } catch {}
      audioRef.current = null;
    };
  }, []);

  async function toggle() {
    if (!audioRef.current) return;
    try {
      if (!on) {
        await audioRef.current.play();
        setOn(true);
      } else {
        audioRef.current.pause();
        setOn(false);
      }
    } catch {
      // autoplay policy / codec issue — залишаємо тихо, без алертів
      setOn(false);
    }
  }

  if (!site.audio?.src) return null;

  return (
    <button className={styles.btn} type="button" onClick={toggle}>
      {on ? "Sound: On" : "Sound: Off"}
    </button>
  );
}
