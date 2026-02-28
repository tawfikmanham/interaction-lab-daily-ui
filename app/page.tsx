"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PianoKey = {
  id: string;
  note: string;
  frequency: number;
  isBlack: boolean;
  left: number;
  keyboardLabel: string;
};

const WHITE_KEY_WIDTH = 92;
const BLACK_KEY_WIDTH = 56;
const BLACK_KEY_OFFSET = BLACK_KEY_WIDTH / 2;

const KEYS: PianoKey[] = [
  { id: "c4", note: "C4", frequency: 261.63, isBlack: false, left: 0, keyboardLabel: "1" },
  { id: "c4s", note: "C#4", frequency: 277.18, isBlack: true, left: WHITE_KEY_WIDTH - BLACK_KEY_OFFSET, keyboardLabel: "2" },
  { id: "d4", note: "D4", frequency: 293.66, isBlack: false, left: WHITE_KEY_WIDTH, keyboardLabel: "3" },
  { id: "d4s", note: "D#4", frequency: 311.13, isBlack: true, left: WHITE_KEY_WIDTH * 2 - BLACK_KEY_OFFSET, keyboardLabel: "4" },
  { id: "e4", note: "E4", frequency: 329.63, isBlack: false, left: WHITE_KEY_WIDTH * 2, keyboardLabel: "5" },
  { id: "f4", note: "F4", frequency: 349.23, isBlack: false, left: WHITE_KEY_WIDTH * 3, keyboardLabel: "6" },
  { id: "f4s", note: "F#4", frequency: 369.99, isBlack: true, left: WHITE_KEY_WIDTH * 4 - BLACK_KEY_OFFSET, keyboardLabel: "7" },
  { id: "g4", note: "G4", frequency: 392.0, isBlack: false, left: WHITE_KEY_WIDTH * 4, keyboardLabel: "8" },
  { id: "g4s", note: "G#4", frequency: 415.3, isBlack: true, left: WHITE_KEY_WIDTH * 5 - BLACK_KEY_OFFSET, keyboardLabel: "9" },
  { id: "a4", note: "A4", frequency: 440.0, isBlack: false, left: WHITE_KEY_WIDTH * 5, keyboardLabel: "0" },
  { id: "a4s", note: "A#4", frequency: 466.16, isBlack: true, left: WHITE_KEY_WIDTH * 6 - BLACK_KEY_OFFSET, keyboardLabel: "-" },
  { id: "b4", note: "B4", frequency: 493.88, isBlack: false, left: WHITE_KEY_WIDTH * 6, keyboardLabel: "=" },
];

const KEY_LOOKUP = KEYS.reduce<Record<string, PianoKey>>((acc, key) => {
  acc[key.keyboardLabel] = key;
  return acc;
}, {});

const WHITE_KEYS = KEYS.filter((key) => !key.isBlack);
const BLACK_KEYS = KEYS.filter((key) => key.isBlack);
const KEYBOARD_HINT = KEYS.map((key) => key.keyboardLabel).join(" ");

export default function Home() {
  const [activeKeyId, setActiveKeyId] = useState<string | null>(null);
  const [recentSequence, setRecentSequence] = useState<string>("");
  const [recordedSequence, setRecordedSequence] = useState<PianoKey[]>([]);
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const playbackTimeoutsRef = useRef<number[]>([]);

  const keyboardMap = useMemo(() => KEY_LOOKUP, []);

  const ensureAudio = useCallback(() => {
    if (typeof window === "undefined") return null;

    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      const context = new AudioCtx();
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

  const playKey = useCallback(
    (key: PianoKey, options?: { record?: boolean }) => {
      const context = ensureAudio();
      const masterGain = masterGainRef.current;
      if (!context || !masterGain) return;

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(key.frequency, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.42, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      oscillator.connect(gain);
      gain.connect(masterGain);

      oscillator.start(now);
      oscillator.stop(now + 0.3);

      setActiveKeyId(key.id);
      setRecentSequence((prev) => `${prev}${key.keyboardLabel}`.slice(-24));
      if (options?.record !== false) {
        setRecordedSequence((prev) => [...prev.slice(-63), key]);
      }

      window.setTimeout(() => setActiveKeyId((current) => (current === key.id ? null : current)), 120);
    },
    [ensureAudio]
  );

  const stopPlayback = useCallback(() => {
    playbackTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    playbackTimeoutsRef.current = [];
    setIsPlayingBack(false);
  }, []);

  const playRecordedSequence = useCallback(() => {
    if (!recordedSequence.length || isPlayingBack) return;

    setIsPlayingBack(true);
    const stepMs = 280;
    recordedSequence.forEach((key, index) => {
      const timeoutId = window.setTimeout(() => {
        playKey(key, { record: false });
      }, index * stepMs);
      playbackTimeoutsRef.current.push(timeoutId);
    });

    const endTimeoutId = window.setTimeout(() => {
      playbackTimeoutsRef.current = [];
      setIsPlayingBack(false);
    }, recordedSequence.length * stepMs + 60);
    playbackTimeoutsRef.current.push(endTimeoutId);
  }, [isPlayingBack, playKey, recordedSequence]);

  const clearRecordedSequence = useCallback(() => {
    stopPlayback();
    setRecordedSequence([]);
    setRecentSequence("");
  }, [stopPlayback]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const key = keyboardMap[event.key];
      if (!key) return;
      event.preventDefault();
      playKey(key);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [keyboardMap, playKey]);

  useEffect(() => {
    return () => {
      stopPlayback();
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
  }, [stopPlayback]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-100 via-orange-50 to-amber-100 p-6 text-zinc-900 md:p-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 rounded-3xl border border-zinc-900/10 bg-white/80 p-6 shadow-xl backdrop-blur-sm md:p-8">
        <header className="space-y-3">
          <p className="inline-block rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
            Tiny Piano Lab
          </p>
          <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
            Click keys or type numbers to play
          </h1>
          <p className="max-w-2xl text-sm text-zinc-700 md:text-base">
            Your idea works perfectly. Tap white and black keys, or type on your keyboard.
            Quick mapping: {KEYBOARD_HINT}
          </p>
          <Link
            href="/daily-ui/globe-wireframe"
            className="inline-block rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-700 transition hover:bg-zinc-100"
          >
            Open 3D Globe Experiment
          </Link>
        </header>

        <section className="space-y-3">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 md:p-5">
            <div
              className="relative mx-auto h-[260px] w-full overflow-x-auto rounded-xl border border-zinc-300 bg-zinc-900 p-3"
              style={{ maxWidth: `${WHITE_KEYS.length * WHITE_KEY_WIDTH + 24}px` }}
            >
              <div
                className="relative h-full"
                style={{ width: `${WHITE_KEYS.length * WHITE_KEY_WIDTH}px`, minWidth: `${WHITE_KEYS.length * WHITE_KEY_WIDTH}px` }}
              >
                {WHITE_KEYS.map((key) => {
                  const isActive = activeKeyId === key.id;
                  return (
                    <button
                      key={key.id}
                      type="button"
                      onClick={() => playKey(key)}
                      className={`absolute bottom-0 h-[220px] rounded-b-xl border border-zinc-400 transition ${
                        isActive ? "bg-amber-200 shadow-inner" : "bg-white hover:bg-amber-50"
                      }`}
                      style={{ left: `${key.left}px`, width: `${WHITE_KEY_WIDTH}px` }}
                      aria-label={`${key.note} key`}
                    >
                      <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm font-semibold text-zinc-700">
                        {key.keyboardLabel}
                      </span>
                      <span className="absolute bottom-9 left-1/2 -translate-x-1/2 text-xs text-zinc-500">
                        {key.note}
                      </span>
                    </button>
                  );
                })}

                {BLACK_KEYS.map((key) => {
                  const isActive = activeKeyId === key.id;
                  return (
                    <button
                      key={key.id}
                      type="button"
                      onClick={() => playKey(key)}
                      className={`absolute top-0 z-10 h-[140px] rounded-b-lg border border-zinc-700 transition ${
                        isActive ? "bg-amber-500" : "bg-zinc-900 hover:bg-zinc-700"
                      }`}
                      style={{ left: `${key.left}px`, width: `${BLACK_KEY_WIDTH}px` }}
                      aria-label={`${key.note} sharp key`}
                    >
                      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs font-semibold text-white">
                        {key.keyboardLabel}
                      </span>
                      <span className="absolute bottom-7 left-1/2 -translate-x-1/2 text-[10px] text-zinc-300">
                        {key.note}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
            <p className="font-medium text-zinc-900">Recent typed sequence</p>
            <p className="mt-1 font-mono">{recentSequence || "Start typing 1 3 5..."}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={playRecordedSequence}
                disabled={!recordedSequence.length || isPlayingBack}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {isPlayingBack ? "Playing..." : "Play Recording"}
              </button>
              <button
                type="button"
                onClick={clearRecordedSequence}
                disabled={!recordedSequence.length}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-400"
              >
                Clear
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
