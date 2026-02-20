"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import styles from "./page.module.css";

type PianoKey = {
  id: string;
  note: string;
  frequency: number;
  isBlack: boolean;
  left: number;
  keyLabel: string;
  altKey?: string;
};

const WHITE_WIDTH = 54;
const BLACK_WIDTH = 32;
const BLACK_OFFSET = BLACK_WIDTH / 2;

const KEYS: PianoKey[] = [
  { id: "c4", note: "C4", frequency: 261.63, isBlack: false, left: 0, keyLabel: "A", altKey: "1" },
  { id: "c4s", note: "C#4", frequency: 277.18, isBlack: true, left: WHITE_WIDTH - BLACK_OFFSET, keyLabel: "W", altKey: "2" },
  { id: "d4", note: "D4", frequency: 293.66, isBlack: false, left: WHITE_WIDTH, keyLabel: "S", altKey: "3" },
  { id: "d4s", note: "D#4", frequency: 311.13, isBlack: true, left: WHITE_WIDTH * 2 - BLACK_OFFSET, keyLabel: "E", altKey: "4" },
  { id: "e4", note: "E4", frequency: 329.63, isBlack: false, left: WHITE_WIDTH * 2, keyLabel: "D", altKey: "5" },
  { id: "f4", note: "F4", frequency: 349.23, isBlack: false, left: WHITE_WIDTH * 3, keyLabel: "F", altKey: "6" },
  { id: "f4s", note: "F#4", frequency: 369.99, isBlack: true, left: WHITE_WIDTH * 4 - BLACK_OFFSET, keyLabel: "T", altKey: "7" },
  { id: "g4", note: "G4", frequency: 392, isBlack: false, left: WHITE_WIDTH * 4, keyLabel: "G", altKey: "8" },
  { id: "g4s", note: "G#4", frequency: 415.3, isBlack: true, left: WHITE_WIDTH * 5 - BLACK_OFFSET, keyLabel: "Y", altKey: "9" },
  { id: "a4", note: "A4", frequency: 440, isBlack: false, left: WHITE_WIDTH * 5, keyLabel: "H", altKey: "0" },
  { id: "a4s", note: "A#4", frequency: 466.16, isBlack: true, left: WHITE_WIDTH * 6 - BLACK_OFFSET, keyLabel: "U", altKey: "-" },
  { id: "b4", note: "B4", frequency: 493.88, isBlack: false, left: WHITE_WIDTH * 6, keyLabel: "J", altKey: "=" },
  { id: "c5", note: "C5", frequency: 523.25, isBlack: false, left: WHITE_WIDTH * 7, keyLabel: "K" },
];

const WHITE_KEYS = KEYS.filter((key) => !key.isBlack);
const BLACK_KEYS = KEYS.filter((key) => key.isBlack);

function buildKeyLookup() {
  const lookup: Record<string, PianoKey> = {};
  KEYS.forEach((key) => {
    lookup[key.keyLabel.toLowerCase()] = key;
    if (key.altKey) lookup[key.altKey] = key;
  });
  return lookup;
}

export default function PianoV3Page() {
  const [activeKeyId, setActiveKeyId] = useState<string | null>(null);
  const [sequence, setSequence] = useState<PianoKey[]>([]);
  const [typedQueue, setTypedQueue] = useState<PianoKey[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const playbackTimersRef = useRef<number[]>([]);
  const typedQueueRef = useRef<PianoKey[]>([]);

  const keyLookup = useMemo(() => buildKeyLookup(), []);

  const ensureAudio = useCallback(() => {
    if (typeof window === "undefined") return null;

    if (!audioContextRef.current) {
      const AudioCtor =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtor) return null;

      const context = new AudioCtor();
      const masterGain = context.createGain();
      masterGain.gain.value = 0.14;
      masterGain.connect(context.destination);
      audioContextRef.current = context;
      masterGainRef.current = masterGain;
    }

    if (audioContextRef.current.state === "suspended") {
      void audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }, []);

  const playNote = useCallback(
    (key: PianoKey, options?: { record?: boolean }) => {
      const context = ensureAudio();
      const masterGain = masterGainRef.current;
      if (!context || !masterGain) return;

      const now = context.currentTime;
      const osc = context.createOscillator();
      const gain = context.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(key.frequency, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.35, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.28);

      setActiveKeyId(key.id);
      window.setTimeout(() => {
        setActiveKeyId((current) => (current === key.id ? null : current));
      }, 110);

      if (options?.record !== false) {
        setSequence((prev) => [...prev.slice(-79), key]);
      }
    },
    [ensureAudio]
  );

  const stopPlayback = useCallback(() => {
    playbackTimersRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    playbackTimersRef.current = [];
    setIsPlaying(false);
  }, []);

  const playKeys = useCallback(
    (keysToPlay: PianoKey[]) => {
      if (!keysToPlay.length || isPlaying) return;

      setIsPlaying(true);
      const stepMs = 240;

      keysToPlay.forEach((key, index) => {
        const timeoutId = window.setTimeout(() => {
          playNote(key, { record: false });
        }, index * stepMs);
        playbackTimersRef.current.push(timeoutId);
      });

      const endTimer = window.setTimeout(() => {
        playbackTimersRef.current = [];
        setIsPlaying(false);
      }, keysToPlay.length * stepMs + 30);

      playbackTimersRef.current.push(endTimer);
    },
    [isPlaying, playNote]
  );

  const playSequence = useCallback(() => {
    playKeys(sequence);
  }, [playKeys, sequence]);

  const clearSequence = useCallback(() => {
    stopPlayback();
    setSequence([]);
    setTypedQueue([]);
  }, [stopPlayback]);

  useEffect(() => {
    typedQueueRef.current = typedQueue;
  }, [typedQueue]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      if (event.key === "Delete" || event.key === "Backspace" || event.key === " ") {
        event.preventDefault();
        clearSequence();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        playKeys(typedQueueRef.current);
        return;
      }
      const key = keyLookup[event.key.toLowerCase()] ?? keyLookup[event.key];
      if (!key) return;
      event.preventDefault();
      playNote(key);
      setTypedQueue((prev) => [...prev.slice(-39), key]);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [clearSequence, keyLookup, playKeys, playNote]);


  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
  }, [stopPlayback]);

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <section className={styles.card}>
          <header className={styles.header}>
            <div>
              <p className={styles.eyebrow}>Daily UI V3</p>
              <h1 className={styles.title}>Refined Piano</h1>
              <p className={styles.subtitle}>React + shadcn-inspired visual styling</p>
            </div>

            <div className={styles.helpArea}>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Toggle help"
                onClick={() => setShowHelp((prev) => !prev)}
              >
                i
              </button>
              <div className={`${styles.tip} ${showHelp ? styles.tipVisible : ""}`}>
                Keyboard map: A W S E D F T G Y H U J K. Alternate numbers: 1 2 3 4 5 6 7 8 9 0 - =.
              </div>
            </div>
          </header>

          <div className={styles.pianoShell}>
            <div className={styles.pianoSurface}>
              <div
                className={styles.piano}
                style={{ width: `${WHITE_KEYS.length * WHITE_WIDTH}px`, minWidth: `${WHITE_KEYS.length * WHITE_WIDTH}px` }}
              >
                {WHITE_KEYS.map((key) => (
                  <button
                    key={key.id}
                    type="button"
                    onClick={() => playNote(key)}
                    aria-label={`${key.note} key`}
                    className={`${styles.key} ${styles.whiteKey} ${activeKeyId === key.id ? styles.activeWhite : ""}`}
                    style={{ left: `${key.left}px`, width: `${WHITE_WIDTH}px` }}
                  >
                    <span className={styles.noteLabel}>{key.note}</span>
                    <span className={styles.keyLabel}>{key.keyLabel}</span>
                  </button>
                ))}

                {BLACK_KEYS.map((key) => (
                  <button
                    key={key.id}
                    type="button"
                    onClick={() => playNote(key)}
                    aria-label={`${key.note} sharp key`}
                    className={`${styles.key} ${styles.blackKey} ${activeKeyId === key.id ? styles.activeBlack : ""}`}
                    style={{ left: `${key.left}px`, width: `${BLACK_WIDTH}px` }}
                  >
                    <span className={styles.blackKeyLabel}>{key.keyLabel}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <footer className={styles.footer}>
            <div className={styles.sequenceBlock}>
              <p className={styles.sequence}>{sequence.length ? sequence.map((k) => k.keyLabel).join(" ") : "Start playing..."}</p>
              <p className={styles.hint}>
                Press Enter to replay typed keys: {typedQueue.length ? typedQueue.map((k) => k.keyLabel).join(" ") : "-"}
              </p>
            </div>
            <div className={styles.controls}>
              <button
                type="button"
                className={styles.iconButton}
                onClick={playSequence}
                disabled={!sequence.length || isPlaying}
                aria-label="Play sequence"
              >
                {isPlaying ? ".." : "▶"}
              </button>
              <button
                type="button"
                className={styles.iconButton}
                onClick={clearSequence}
                disabled={!sequence.length}
                aria-label="Clear sequence"
              >
                ⌫
              </button>
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}
