'use client';

import React, { useState, useRef } from 'react';

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

type SpotlightProps = {
  /** Set to false if you want to control visibility from a parent. Default: true */
  open?: boolean;
  /** Optional ARIA label for screen readers */
  ariaLabel?: string;
};

export default function Spotlight({ open = true, ariaLabel = 'Spotlight Search' }: SpotlightProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    if (recognitionRef.current) {
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsRecording(true);
      };

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
        const result = event.results[0][0].transcript;
        setTranscript(result);
        setSearchQuery(result);
      };

      recognitionRef.current.onerror = (event: Event) => {
        console.error('Speech recognition error:', event);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current.start();
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (!open) return null;

  return (
    <div
      aria-label={ariaLabel}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-start justify-center p-6 sm:p-8"
    >
      {/* Dimmed, blurred backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Spotlight card */}
      <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/70 shadow-2xl ring-1 ring-white/10">
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
          {/* Magnifying glass icon (no dependency) */}
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5 shrink-0 text-neutral-400"
          >
            <path
              fill="currentColor"
              d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z"
            />
          </svg>

          <input
            type="text"
            autoFocus
            placeholder="Search or speak..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-base text-neutral-100 placeholder:text-neutral-500 outline-none"
          />

          {/* Microphone button */}
          <button
            onClick={handleMicClick}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${
              isRecording 
                ? 'bg-red-500/20 text-red-400 ring-2 ring-red-500/50' 
                : 'bg-white/10 text-neutral-400 hover:bg-white/20 hover:text-neutral-300'
            }`}
            title={isRecording ? 'Stop recording' : 'Start voice input'}
            aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
          >
            {isRecording ? (
              // Recording indicator (pulsing dot)
              <div className="relative">
                <div className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
                <div className="absolute inset-0 h-2 w-2 rounded-full bg-red-400 animate-ping" />
              </div>
            ) : (
              // Microphone icon
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>

          {/* Shortcut hint pill (purely visual) */}
          <kbd className="hidden select-none items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium text-neutral-300 sm:flex">
            ⌘ <span className="text-neutral-400">Space</span>
          </kbd>
        </div>
      </div>
    </div>
  );
}
