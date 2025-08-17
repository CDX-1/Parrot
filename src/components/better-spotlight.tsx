'use client';

import { OllamaResponse, processCommand } from "@/lib/ollama";
import { useState, useEffect, useRef } from "react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { ArrowRight, CheckCircle2Icon, RefreshCcw, TerminalSquareIcon, Trash, ChevronDown, Download } from "lucide-react";
import { Button } from "./ui/button";
import { titlecase } from "@/lib/utils";
import { Spinner } from "./ui/shadcn-io/spinner";
import { register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { currentMonitor, getCurrentWindow, PhysicalPosition, PhysicalSize } from '@tauri-apps/api/window';

export default function Spotlight() {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Loading...");
    const [response, setResponse] = useState<OllamaResponse | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [selectedModel, setSelectedModel] = useState("llama3.2:3b-instruct");
    const [installedModels, setInstalledModels] = useState<string[]>([]);
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
    const spotlightRef = useRef<HTMLDivElement>(null);
    const modelDropdownRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    // Available models list with full IDs - you can modify this based on your needs
    const availableModels = [
        "llama3.2:3b-instruct",
        "llama3.2:1b-instruct",
        "llama3.1:8b-instruct-q4_0",
        "llama3.1:70b-instruct",
        "llama2:7b-chat",
        "llama2:13b-chat",
        "codellama:7b-instruct",
        "codellama:13b-instruct",
        "mistral:7b-instruct",
        "phi:3.5",
        "gemma:7b-instruct",
        "qwen2.5:7b",
        "qwen2.5:14b-instruct",
        "gemma3:12b-it-qat"
    ];

    // Check which models are installed
    const checkInstalledModels = async () => {
        try {
            const response = await fetch('http://localhost:11434/api/tags');
            const data = await response.json();
            const modelNames = data.models?.map((model: any) => model.name.split(':')[0]) || [];
            setInstalledModels(modelNames);
        } catch (error) {
            console.error('Failed to fetch installed models:', error);
            setInstalledModels([]);
        }
    };

    // Pull a model if not installed
    const pullModel = async (modelName: string) => {
        try {
            setLoadingMessage(`Downloading ${modelName}...`);
            const response = await fetch('http://localhost:11434/api/pull', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: modelName }),
            });
            
            if (!response.ok) {
                throw new Error(`Failed to pull model: ${response.statusText}`);
            }
            
            // Refresh the installed models list
            await checkInstalledModels();
            setLoadingMessage("Loading...");
        } catch (error) {
            console.error('Failed to pull model:', error);
            setLoadingMessage("Loading...");
            throw error;
        }
    };

    const handleCommand = async () => {
        if (response) {
            const res = await response.executor();
            setResponse(res);
            return;
        }

        setLoading(true);
        setLoadingMessage("Loading...");
        try {
            const res = await processCommand(query, selectedModel);
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
            setLoadingMessage("Loading...");
        }
    }

    const handleInstallModel = async () => {
        setLoading(true);
        try {
            await pullModel(selectedModel);
        } catch (e) {
            console.error('Failed to install model:', e);
        } finally {
            setLoading(false);
        }
    }

    const handleReset = async () => {
        setResponse(null);
    };

    const openSpotlight = () => {
        setIsOpen(true);
        setIsAnimating(true);
        getCurrentWindow().show();
        getCurrentWindow().setFocus();
        
        // Remove animation class after animation completes
        setTimeout(() => {
            setIsAnimating(false);
        }, 300);
    };

    const closeSpotlight = () => {
        setIsAnimating(true);
        
        // Hide window immediately to prevent taskbar appearance
        getCurrentWindow().hide();
        
        // Start closing animation
        setTimeout(() => {
            setIsOpen(false);
            setIsAnimating(false);
            setResponse(null);
            setQuery("");
            // Stop any ongoing voice recognition
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            setIsListening(false);
        }, 200); // Animation duration
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
                        openSpotlight();
                        // Check installed models when opening
                        checkInstalledModels();
                        // Start voice input after a short delay to ensure component is mounted
                        setTimeout(() => handleVoiceInput(), 400);
                    }
                });
            } catch (error) {
                console.error('Failed to register global shortcut:', error);
            }
        };

        registerShortcut();
        // Check installed models on mount
        checkInstalledModels();

        // Cleanup on unmount
        return () => {
            unregister('CommandOrControl+Shift+Space').catch(console.error);
        };
    }, [isOpen]);

    useEffect(() => {
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

        // Handle window blur (when clicking on another window)
        const handleWindowBlur = () => {
            if (isOpen) {
                closeSpotlight();
            }
        };

        // Handle click outside model dropdown
        const handleClickOutside = (event: MouseEvent) => {
            if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
                setIsModelDropdownOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('blur', handleWindowBlur);
        
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('blur', handleWindowBlur);
        };
    }, [isOpen, response]); 

    useEffect(() => {
        const observer = new ResizeObserver(async entries => {
            for (const entry of entries) {
                const rect = entry.contentRect;

                // Set a larger fixed window size to accommodate content and provide clickable area
                const width = Math.max(rect.width + 200, 800); // Larger width for clickable area
                const height = Math.max(rect.height + 300, 600); // Larger height for content and clickable area

                const win = getCurrentWindow();
                const monitor = await currentMonitor();

                const screenWidth = monitor!.size.width;
                const screenHeight = monitor!.size.height;

                win.setSize(new PhysicalSize(width, height));
                win.setPosition(new PhysicalPosition(
                    Math.floor((screenWidth - width) / 2),
                    Math.floor((screenHeight - height) / 2)
                ));
            }
        });

        const spotlightElement = document.getElementById("spotlight");
        if (spotlightElement) {
            observer.observe(spotlightElement);
        }
        return () => observer.disconnect();
    }, []);

    // Animation classes
    const getAnimationClasses = () => {
        if (!isOpen) return "opacity-0 scale-75";
        
        if (isAnimating && isOpen) {
            // Opening animation
            return "animate-in zoom-in-95 duration-300 ease-out";
        } else if (isAnimating && !isOpen) {
            // Closing animation
            return "animate-out zoom-out-95 duration-200 ease-in";
        }
        
        return "opacity-100 scale-100";
    };

    return (
        <>
            {(isOpen || isAnimating) && (
                <div
                    id="spotlight"
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-[9999] flex items-start justify-center p-6 sm:p-8"
                    onClick={(e) => {
                        // Close if clicking on the backdrop (not the card)
                        if (e.target === e.currentTarget) {
                            closeSpotlight();
                        }
                    }}
                >
                    {/* Spotlight card */}
                    <div 
                        ref={spotlightRef}
                        className={`relative z-10 w-full max-w-2xl rounded-2xl bg-neutral-900 shadow-2xl mt-20 transition-all ${getAnimationClasses()}`}
                        style={{
                            transformOrigin: 'center top'
                        }}
                        onClick={(e) => {
                            // Prevent closing when clicking inside the card
                            e.stopPropagation();
                        }}
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

                    {/* Model Selector Dropdown */}
                    <div className="relative" ref={modelDropdownRef}>
                        <button
                            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                            className={`flex h-8 items-center justify-center rounded-lg px-3 py-1 transition-all duration-200 text-sm ${
                                installedModels.includes(selectedModel.split(':')[0])
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            } hover:bg-white/10`}
                            title={`Current model: ${selectedModel} (${installedModels.includes(selectedModel.split(':')[0]) ? 'installed' : 'not installed'})`}
                        >
                            <span className="mr-1 max-w-24 truncate">{selectedModel}</span>
                            <ChevronDown className="h-3 w-3" />
                        </button>

                        {/* Dropdown Menu */}
                        {isModelDropdownOpen && (
                            <div className="absolute right-0 top-9 z-50 w-56 rounded-lg bg-neutral-800 border border-white/10 shadow-2xl py-1 max-h-64 overflow-y-auto">
                                {availableModels.map((model) => {
                                    const isInstalled = installedModels.includes(model.split(':')[0]);
                                    return (
                                        <button
                                            key={model}
                                            onClick={() => {
                                                setSelectedModel(model);
                                                setIsModelDropdownOpen(false);
                                            }}
                                            className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-white/5 flex items-center justify-between ${
                                                selectedModel === model ? 'bg-white/10' : ''
                                            }`}
                                        >
                                            <span className="text-neutral-200 truncate">{model}</span>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {!isInstalled && <Download className="h-3 w-3 text-yellow-400" />}
                                                <div
                                                    className={`w-2 h-2 rounded-full ${
                                                        isInstalled ? 'bg-green-400' : 'bg-yellow-400'
                                                    }`}
                                                />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {response !== null && (
                    <>
                        <div className="flex flex-col border-t-1 px-4 py-3 gap-4">
                            <div className="flex gap-2 items-baseline text-muted-foreground">
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
                                <p>{loadingMessage}</p>
                            </>
                        )}
                    </div>

                    <div className="flex gap-3 items-center">
                        <div className="flex items-center gap-3">
                            <p className="text-muted-foreground text-sm">Press enter or</p>
                            {installedModels.includes(selectedModel.split(':')[0]) ? (
                                <Button
                                    size="sm"
                                    variant={response ? "outline" : "secondary"}
                                    className="hover:cursor-pointer"
                                    onClick={handleCommand}
                                >
                                    <ArrowRight />
                                    <span>Confirm</span>
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="hover:cursor-pointer bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30"
                                    onClick={handleInstallModel}
                                >
                                    <Download className="h-4 w-4" />
                                    <span>Install {selectedModel.split(':')[0]}</span>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
            )}
        </>
    );
}