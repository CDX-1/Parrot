'use client';

import { OllamaResponse, processCommand } from "@/lib/ollama";
import { useState, useEffect, useRef } from "react";
import { ChevronDown, Download } from "lucide-react";
import { register, unregister } from '@tauri-apps/plugin-global-shortcut';
import { currentMonitor, getCurrentWindow, PhysicalPosition, PhysicalSize } from '@tauri-apps/api/window';

export default function MiniVoiceAssistant() {
    const [isListening, setIsListening] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedModel, setSelectedModel] = useState("llama3.2:3b-instruct");
    const [installedModels, setInstalledModels] = useState<string[]>([]);
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
    const [lastTranscript, setLastTranscript] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    
    const modelDropdownRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    // Available models list
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
            
            await checkInstalledModels();
        } catch (error) {
            console.error('Failed to pull model:', error);
            throw error;
        }
    };

    const handleVoiceInput = async () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Speech recognition is not supported in your browser');
            return;
        }

        // If model is not installed, install it first
        if (!installedModels.includes(selectedModel.split(':')[0])) {
            setIsProcessing(true);
            try {
                await pullModel(selectedModel);
            } catch (e) {
                console.error('Failed to install model:', e);
                setIsProcessing(false);
                return;
            }
            setIsProcessing(false);
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

        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            setLastTranscript(transcript);
            setIsListening(false);
            setIsProcessing(true);

            try {
                // Process the voice command
                const response = await processCommand(transcript, selectedModel);
                if (response && response.executor) {
                    // Execute the command
                    await response.executor();
                }
            } catch (error) {
                console.error('Failed to process voice command:', error);
            } finally {
                setIsProcessing(false);
                // Clear transcript after a delay
                setTimeout(() => setLastTranscript(""), 3000);
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
            setIsProcessing(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    const toggleMiniAssistant = () => {
        setIsOpen(!isOpen);
    };

    const positionWindow = async () => {
        // For the mini assistant, we don't need to reposition the window
        // since we're working within the existing 800x700 window
        // The CSS positioning will handle it relative to the window
    };

    useEffect(() => {
        // Register global shortcut for mini assistant
        const registerShortcut = async () => {
            try {
                await register('CommandOrControl+Shift+V', () => {
                    setIsOpen(!isOpen);
                });
            } catch (error) {
                console.error('Failed to register global shortcut:', error);
            }
        };

        registerShortcut();
        checkInstalledModels();

        return () => {
            unregister('CommandOrControl+Shift+V').catch(console.error);
        };
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                event.preventDefault();
                toggleMiniAssistant();
            }
            // Space to start voice input
            if (event.code === 'Space' && isOpen && !isListening && !isProcessing) {
                event.preventDefault();
                handleVoiceInput();
            }
        };

        // Handle click outside model dropdown
        const handleClickOutside = (event: MouseEvent) => {
            if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
                setIsModelDropdownOpen(false);
            }
        };

        // Handle window blur
        const handleWindowBlur = () => {
            setIsModelDropdownOpen(false);
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('blur', handleWindowBlur);
        
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('blur', handleWindowBlur);
        };
    }, [isOpen, isListening, isProcessing]);

    const getStatusColor = () => {
        if (isProcessing) return 'bg-blue-500';
        if (isListening) return 'bg-red-500 animate-pulse';
        return 'bg-neutral-600';
    };

    const getStatusText = () => {
        if (isProcessing) return 'Processing...';
        if (isListening) return 'Listening...';
        if (lastTranscript) return `"${lastTranscript}"`;
        return 'Press Space or Click Mic';
    };

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 z-[9998] pointer-events-none">
                    <div 
                        className="absolute bottom-20 right-20 pointer-events-auto"
                        style={{ width: '280px' }}
                    >
                        {/* Mini Assistant Card */}
                        <div className="rounded-xl bg-neutral-900 shadow-2xl border border-white/10 p-3">
                            {/* Main Row */}
                            <div className="flex items-center gap-3">
                                {/* Status Indicator */}
                                <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />

                                {/* Microphone Button */}
                                <button
                                    onClick={handleVoiceInput}
                                    disabled={isProcessing}
                                    className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200 ${
                                        isListening 
                                            ? 'bg-red-500 text-white animate-pulse' 
                                            : isProcessing
                                            ? 'bg-blue-500/20 text-blue-400 cursor-not-allowed'
                                            : 'bg-white/10 text-neutral-400 hover:bg-white/20 hover:text-neutral-300'
                                    }`}
                                    title="Start voice input (or press Space)"
                                >
                                    {isProcessing ? (
                                        // Processing spinner
                                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    ) : (
                                        // Microphone icon
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                        </svg>
                                    )}
                                </button>

                                {/* Model Selector */}
                                <div className="relative flex-1" ref={modelDropdownRef}>
                                    <button
                                        onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                                        className={`flex h-8 w-full items-center justify-between rounded-lg px-3 py-1 transition-all duration-200 text-xs ${
                                            installedModels.includes(selectedModel.split(':')[0])
                                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                        } hover:bg-white/10`}
                                        title={`Current model: ${selectedModel}`}
                                    >
                                        <span className="truncate">{selectedModel}</span>
                                        <ChevronDown className="h-3 w-3 flex-shrink-0 ml-1" />
                                    </button>

                                    {/* Dropdown Menu */}
                                    {isModelDropdownOpen && (
                                        <div className="absolute bottom-10 right-0 z-50 w-56 rounded-lg bg-neutral-800 border border-white/10 shadow-2xl py-1 max-h-48 overflow-y-auto">
                                            {availableModels.map((model) => {
                                                const isInstalled = installedModels.includes(model.split(':')[0]);
                                                return (
                                                    <button
                                                        key={model}
                                                        onClick={() => {
                                                            setSelectedModel(model);
                                                            setIsModelDropdownOpen(false);
                                                        }}
                                                        className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-white/5 flex items-center justify-between ${
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

                            {/* Status Text */}
                            <div className="mt-2 text-xs text-neutral-400 truncate">
                                {getStatusText()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}