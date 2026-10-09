import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import useToast from '../../hooks/useToast';

export default function MicButton({ onTranscript }) {
  const toast = useToast();
  const [listening, setListening] = useState(false);
  const recogRef = useRef(null);
  const supported =
    typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    if (!supported) return;
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Rec();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-IN'; // Handles Hinglish reasonably
    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(' ')
        .trim();
      if (text) onTranscript?.(text);
    };
    rec.onerror = (e) => {
      setListening(false);
      if (e.error === 'not-allowed') toast.error('Microphone permission denied');
      else toast.error('Voice input failed');
    };
    rec.onend = () => setListening(false);
    recogRef.current = rec;
    return () => {
      try { rec.abort(); } catch (_) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  const toggle = () => {
    if (!supported) {
      toast.error('Voice input is not supported in this browser');
      return;
    }
    const rec = recogRef.current;
    if (!rec) return;
    if (listening) {
      try { rec.stop(); } catch (_) {}
      setListening(false);
    } else {
      try {
        rec.start();
        setListening(true);
      } catch (_) {
        toast.error('Could not start microphone');
      }
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={supported ? 'Speak your expense' : 'Voice input not supported'}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
        listening
          ? 'border-brand-500 bg-brand-50 text-brand-600'
          : 'border-line bg-white text-muted hover:border-brand-300 hover:text-brand-600'
      }`}
      aria-label="Voice input"
    >
      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </button>
  );
}