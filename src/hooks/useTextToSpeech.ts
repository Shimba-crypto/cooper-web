import { useCallback, useEffect, useRef, useState } from "react";

export function useTextToSpeech() {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const chunksRef = useRef<string[]>([]);
  const chunkIndex = useRef(0);

  const pickVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    const preferred = ["en-ZA", "en-GB", "en-US", "en"];
    for (const lang of preferred) {
      const voice = voices.find((v) => v.lang.toLowerCase().startsWith(lang));
      if (voice) return voice;
    }
    return voices[0] ?? null;
  }, []);

  const speakNext = useCallback(() => {
    const synth = window.speechSynthesis;
    if (chunkIndex.current >= chunksRef.current.length) {
      setSpeaking(false);
      setPaused(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(chunksRef.current[chunkIndex.current]);
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 1;
    utterance.onend = () => {
      chunkIndex.current += 1;
      speakNext();
    };
    utterance.onerror = () => {
      chunkIndex.current += 1;
      speakNext();
    };
    synth.speak(utterance);
  }, [pickVoice]);

  const play = useCallback(
    (text: string) => {
      const synth = window.speechSynthesis;
      synth.cancel();
      const clean = text
        .replace(/[#*_`~>-]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      if (!clean) return;
      chunksRef.current = clean.match(/[^.!?]+[.!?]?|\S[^.!?]*$/g)?.map((c) => c.trim()).filter(Boolean) ?? [clean];
      chunkIndex.current = 0;
      setSpeaking(true);
      setPaused(false);
      speakNext();
    },
    [speakNext]
  );

  const pause = useCallback(() => {
    const synth = window.speechSynthesis;
    if (synth.speaking && !synth.paused) {
      synth.pause();
      setPaused(true);
    }
  }, []);

  const resume = useCallback(() => {
    const synth = window.speechSynthesis;
    if (synth.paused) {
      synth.resume();
      setPaused(false);
    }
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
  }, []);

  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported]);

  return { supported, speaking, paused, play, pause, resume, stop };
}
