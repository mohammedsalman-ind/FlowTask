import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { parseTaskText } from '../../api/ml';
import type { ParseTaskResponse } from '../../types';

interface VoiceButtonProps {
  onParsed: (data: ParseTaskResponse) => void;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({ onParsed }) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize SpeechRecognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        setIsProcessing(true);

        // Call ML API
        const parsedData = await parseTaskText(transcript);
        setIsProcessing(false);

        if (parsedData) {
          onParsed(parsedData);
          toast.success('Voice parsed successfully!');
        } else {
          toast.error('Failed to understand task.');
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          toast.error(`Microphone error: ${event.error}`);
        }
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [onParsed]);

  const toggleListen = () => {
    if (isProcessing) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (!recognitionRef.current) {
        toast.error('Speech recognition is not supported in this browser.');
        return;
      }
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <button
      onClick={toggleListen}
      disabled={isProcessing}
      title="Create task via voice"
      className={`
        relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300
        ${isListening 
          ? 'bg-red-500/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
          : isProcessing
          ? 'bg-accent/20 text-accent opacity-50 cursor-not-allowed'
          : 'bg-surface border border-stone-300/60 text-text hover:bg-surface-2 hover:text-accent'
        }
      `}
    >
      {/* Waveform animation bars if listening */}
      {isListening ? (
        <div className="absolute inset-0 flex items-center justify-center gap-0.5">
          <div className="w-1 h-3 bg-red-500 rounded-full animate-waveform" style={{ animationDelay: '0s' }} />
          <div className="w-1 h-4 bg-red-500 rounded-full animate-waveform" style={{ animationDelay: '0.1s' }} />
          <div className="w-1 h-2 bg-red-500 rounded-full animate-waveform" style={{ animationDelay: '0.2s' }} />
          <div className="w-1 h-5 bg-red-500 rounded-full animate-waveform" style={{ animationDelay: '0.3s' }} />
        </div>
      ) : isProcessing ? (
        <span className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
        </svg>
      )}
    </button>
  );
};
