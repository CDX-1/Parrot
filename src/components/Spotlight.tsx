'use client';

import { useEffect, useState, useRef, ChangeEvent, KeyboardEvent } from 'react';
import { currentMonitor, getCurrentWindow, PhysicalPosition, PhysicalSize } from "@tauri-apps/api/window";
import { processCommand } from '@/lib/ollama';
import { Action } from '@/lib/actions';

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
	const [isRecording, setIsRecording] = useState(true); // Start recording by default
	const [transcript, setTranscript] = useState('');
	const [searchQuery, setSearchQuery] = useState('');
	const [actions, setActions] = useState<Action[]>([]);
	const [isProcessing, setIsProcessing] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const [aiResponse, setAiResponse] = useState('');
	const [aiInput, setAiInput] = useState('');
	const [isAiProcessing, setIsAiProcessing] = useState(false);
	const recognitionRef = useRef<SpeechRecognition | null>(null);

	// Start recording automatically when component mounts
	useEffect(() => {
		if (open) {
			startRecording();
		}
	}, [open]);

    useEffect(() => {
        const observer = new ResizeObserver(async entries => {
            for (const entry of entries) {
                const rect = entry.contentRect;

                const width = Math.max(rect.width + 32, 450);
                const height = Math.max(rect.height + 32, 102);

                const win = getCurrentWindow();
                const monitor = await currentMonitor();

                const screenWidth = monitor!.size.width;
                const screenHeight = monitor!.size.height;

                // win.setSize(new PhysicalSize(width, height));
                // win.setPosition(new PhysicalPosition(
                //     Math.floor((screenWidth - width) / 2),
                //     Math.floor((screenHeight - height) / 2)
                // ));
            }
        });

        const spotlightElement = document.getElementById("spotlight");
        if (spotlightElement) {
            observer.observe(spotlightElement);
        }
        return () => observer.disconnect();
    }, []);

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
		setIsRecording(false);
	};

	const handleMicClick = () => {
		if (isRecording) {
			stopRecording();
		} else {
			startRecording();
		}
	};

	// Handle input changes and stop recording when user types
	const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setSearchQuery(value);

		// If user starts typing and we're recording, stop recording
		if (isRecording && value.length > 0) {
			stopRecording();
		}
	};

	// Handle input focus - restart recording if input is empty
	const handleInputFocus = () => {
		if (searchQuery.length === 0 && !isRecording) {
			startRecording();
		}
	};

	// Process command with Ollama only when Enter is pressed
	const handleSubmit = async () => {
		if (!searchQuery.trim()) return;

		setIsProcessing(true);

		try {
			const actions = await processCommand(searchQuery);

			if (actions && actions.length > 0) {
				setActions(actions);
			} else {
				// setOllamaResponse('No actions to perform for this command.');
			}
		} catch (error) {
			// setOllamaResponse(`Error: ${error}`);
		} finally {
			setIsProcessing(false);
		}
	};

	// Handle Enter key press
	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	};

	// Handle AI interactions
	const handleAiSubmit = async () => {
		if (!aiInput.trim()) return;

		setIsAiProcessing(true);
		setAiResponse('');

		try {
			// Simulate AI response for now - replace with actual AI call
			const response = await processCommand(aiInput);
			
			if (response && response.length > 0) {
				// For now, just show the first action description
				const firstAction = response[0];
				setAiResponse(`I can help you with: ${firstAction.description || 'This action'}`);
			} else {
				setAiResponse("I understand your request. How can I help you further?");
			}
		} catch (error) {
			setAiResponse("I'm having trouble processing that right now. Please try again.");
		} finally {
			setIsAiProcessing(false);
		}
	};

	const handleQuickAction = (action: string) => {
		setAiInput(action);
		setIsExpanded(true);
	};

	if (!open) return null;

	return (
		<div
			aria-label={ariaLabel}
            id="spotlight"
			role="dialog"
			aria-modal="true"
			className="fixed inset-0 z-[9999] flex items-start justify-center p-6 sm:p-8"
		>
			{/* Spotlight card */}
			<div className={`relative z-10 w-7xl rounded-2xl border border-white/10 bg-neutral-900/70 shadow-2xl ring-1 ring-white/10 ${
				isProcessing ? 'moving-border-white' : ''
			}`}>
				{/* Input row */}
				<div className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
					{/* Magnifying glass icon (no dependency) */}
					{/* <svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						className="h-5 w-5 shrink-0 text-neutral-400"
					>
						<path
							fill="currentColor"
							d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0C7.01 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z"
						/>
					</svg> */}

                    <img src="parrot.png" width={30} height={30} />

					<input
						type="text"
						autoFocus
						placeholder={isRecording ? "Listening... Speak now" : "Search or speak..."}
						value={searchQuery}
						onChange={handleInputChange}
						onFocus={handleInputFocus}
						onKeyDown={handleKeyDown}
						className="w-full bg-transparent text-base text-neutral-100 placeholder:text-neutral-500 outline-none"
					/>

					{/* Microphone button */}
					<button
						onClick={handleMicClick}
						className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${isRecording
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

					{/* enter button */}
					{/* <button
						onClick={handleSubmit}
						disabled={isProcessing || !searchQuery.trim()}
						className="flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-medium text-neutral-300 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isProcessing ? (
							<span className="flex items-center gap-0.5">
								<span className="animate-pulse text-white">•</span>
								<span className="animate-pulse text-neutral-400" style={{ animationDelay: '0.2s' }}>•</span>
								<span className="animate-pulse text-white" style={{ animationDelay: '0.4s' }}>•</span>
							</span>
						) : (
							<>
								↳ <span className="text-neutral-400">Enter</span>
							</>
						)}
					</button> */}
				</div>

                {actions.length > 0 && (
                    <>
                        {actions.map((action, i) => (
                            <div key={action.id}>
                                <p>{action.id}</p>
                            </div>
                        ))}
                    </>
                )}

                {/* Expandable AI Interaction Area */}
                <div className="border-t border-white/5">
                    {/* Toggle Button */}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full px-4 py-2 text-left text-sm text-neutral-400 hover:text-neutral-300 hover:bg-white/5 transition-colors flex items-center justify-between"
                    >
                        <span className="flex items-center gap-2">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            AI Assistant
                        </span>
                        <svg 
                            className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {/* Expandable Content */}
                    {isExpanded && (
                        <div className="px-4 pb-4 space-y-3">
                            {/* AI Response Display */}
                            {aiResponse && (
                                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                                    <div className="flex items-start gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                            </svg>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm text-neutral-300 leading-relaxed">{aiResponse}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* AI Input Area */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Ask AI anything..."
                                    value={aiInput}
                                    onChange={(e) => setAiInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAiSubmit()}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none focus:border-white/20 transition-colors"
                                />
                                <button 
                                    onClick={handleAiSubmit}
                                    disabled={isAiProcessing || !aiInput.trim()}
                                    className="px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isAiProcessing ? (
                                        <div className="flex items-center gap-1">
                                            <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                                            <span>Processing...</span>
                                        </div>
                                    ) : (
                                        'Send'
                                    )}
                                </button>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex flex-wrap gap-2">
                                <button 
                                    onClick={() => handleQuickAction("Explain this")}
                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-neutral-300 rounded-md text-xs transition-colors"
                                >
                                    Explain this
                                </button>
                                <button 
                                    onClick={() => handleQuickAction("Summarize")}
                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-neutral-300 rounded-md text-xs transition-colors"
                                >
                                    Summarize
                                </button>
                                <button 
                                    onClick={() => handleQuickAction("Help me write")}
                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-neutral-300 rounded-md text-xs transition-colors"
                                >
                                    Help me write
                                </button>
                            </div>
                        </div>
                    )}
                </div>
			</div>
		</div>
	);
}
