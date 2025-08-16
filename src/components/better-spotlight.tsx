'use client';

import { OllamaResponse, processCommand } from "@/lib/ollama";
import { useState, useEffect, useRef } from "react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { ArrowRight, CheckCircle2Icon, RefreshCcw, TerminalSquareIcon, Trash } from "lucide-react";
import { Button } from "./ui/button";
import { titlecase } from "@/lib/utils";
import { Spinner } from "./ui/shadcn-io/spinner";
import { register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { getCurrentWindow } from '@tauri-apps/api/window';

export default function Spotlight() {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<OllamaResponse | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const spotlightRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    const handleCommand = async () => {
        if (response) {
            const res = await response.executor();
            setResponse(res);
            return;
        }

        setLoading(true);
        try {
            const res = await processCommand(query);
            console.log(res);
            if (!res) throw Error("Model failed to provide a response");
            setResponse(res);
        } catch (e) {
            setResponse({
                actions: [],
                summary: `An error occurred: ${e}`,
                executor: async () => null
            });
        } finally {
            setLoading(false);
        }
    }

    const handleReset = async () => {
        setResponse(null);
    };

    const toggleSpotlight = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            // When opening, focus the input and show window
            getCurrentWindow().show();
            getCurrentWindow().setFocus();
        } else {
            // When closing, hide window and reset state
            getCurrentWindow().hide();
            setResponse(null);
            setQuery("");
        }
    };

    const closeSpotlight = () => {
        setIsOpen(false);
        getCurrentWindow().hide();
        setResponse(null);
        setQuery("");
        // Stop any ongoing voice recognition
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsListening(false);
    };

    const handleVoiceInput = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Speech recognition is not supported in your browser');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setQuery(transcript);
            setIsListening(false);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    useEffect(() => {
        // Register global shortcut
        const registerShortcut = async () => {
            try {
                await register('CommandOrControl+Shift+Space', () => {
                    if (!isOpen) {
                        setIsOpen(true);
                        getCurrentWindow().show();
                        getCurrentWindow().setFocus();
                        // Start voice input after a short delay to ensure component is mounted
                        setTimeout(() => handleVoiceInput(), 100);
                    }
                });
            } catch (error) {
                console.error('Failed to register global shortcut:', error);
            }
        };

        registerShortcut();

        // Cleanup on unmount
        return () => {
            unregister('CommandOrControl+Shift+Space').catch(console.error);
        };
    }, [isOpen]);

    useEffect(() => {
        // Handle click outside to close
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && spotlightRef.current && !spotlightRef.current.contains(event.target as Node)) {
                closeSpotlight();
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.key === 'k') {
                event.preventDefault();
                handleReset();
            }
            if (event.key === 'Enter' && isOpen) {
                event.preventDefault();
                handleCommand();
            }
            if (event.key === 'Escape' && isOpen) {
                event.preventDefault();
                closeSpotlight();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        document.addEventListener('keydown', handleKeyDown);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, response]); 

    return (
        <>
            {isOpen && (
                <div
                    id="spotlight"
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-[9999] flex items-start justify-center p-6 sm:p-8 bg-black/20 backdrop-blur-sm"
                >
                    {/* Spotlight card */}
                    <div 
                        ref={spotlightRef}
                        className="relative z-10 w-full max-w-2xl rounded-2xl border border-white/10 bg-neutral-900 shadow-2xl ring-1 ring-white/10 mt-20"
                    >
                {/* Input row */}
                <div className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
                    {/* Parrot icon */}
                    <img src="parrot.png" width={30} height={30} />

                    <input
                        autoFocus
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            if (isListening) {
                                // Stop voice recognition when user starts typing
                                if (recognitionRef.current) {
                                    recognitionRef.current.stop();
                                }
                                setIsListening(false);
                            }
                        }}
                        placeholder="Search or speak..."
                        className="w-full bg-transparent text-base text-neutral-100 placeholder:text-neutral-500 outline-none"
                    />

                    {/* Microphone button */}
                    <button
                        onClick={handleVoiceInput}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${
                            isListening 
                                ? 'bg-red-500 text-white animate-pulse' 
                                : 'bg-white/10 text-neutral-400 hover:bg-white/20 hover:text-neutral-300'
                        }`}
                        title="Start voice input"
                    >
                        {/* Microphone icon */}
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    </button>
                </div>

                {response !== null && (
                    <>
                        <div className="flex flex-col border-t-1 px-4 py-3 gap-4">
                            <div className="flex gap-2 items-center text-muted-foreground">
                                <TerminalSquareIcon className="size-4" />
                                <p>{response.summary}</p>
                            </div>

                            {response.actions.length > 0 && (
                                <div className="flex flex-col gap-3 font-mono">
                                    {response.actions.map((action, i) => (
                                        <Alert key={i} variant="default">
                                            <CheckCircle2Icon />
                                            <AlertTitle>{titlecase(action.id.replaceAll("_", " "))}</AlertTitle>
                                            <AlertDescription>
                                                {action.description}
                                            </AlertDescription>
                                        </Alert>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                <div className="flex w-full justify-between border-t-1 px-4 py-2">
                    <div className="flex gap-2 items-center text-muted-foreground text-xs">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="flex items-center hover:cursor-pointer"
                            onClick={handleReset}
                        >
                            <RefreshCcw />
                            <span>Reset</span>
                            <span className="font-mono text-xs">ctrl + k</span>
                        </Button>

                        {loading && (
                            <>
                                <Spinner size={18} />
                                <p>Loading...</p>
                            </>
                        )}
                    </div>

                    <div className="flex gap-3 items-center">
                        <div className="flex items-center gap-3">
                            <p className="text-muted-foreground text-sm">Press enter or</p>
                            <Button
                                size="sm"
                                variant={response ? "outline" : "secondary"}
                                className="hover:cursor-pointer"
                                onClick={handleCommand}
                            >
                                <ArrowRight />
                                <span>Confirm</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
            )}
        </>
    );
}