'use client';

import { FileIcon, PlayIcon, StopCircleIcon, VolumeXIcon, Volume2Icon } from "lucide-react";
import { ReactNode, useState, useEffect, useRef, ChangeEvent, KeyboardEvent } from "react";
import { processCommand } from '@/lib/ollama';
import { Action } from '@/lib/actions';

// Enhanced Voice Service Class
class VoiceService {
    private synthesis: SpeechSynthesis;
    private recognition: SpeechRecognition | null = null;
    private onTranscriptCallback?: (transcript: string) => void;
    private onRecordingStateCallback?: (isRecording: boolean) => void;

    constructor() {
        this.synthesis = window.speechSynthesis;
    }

    // Text-to-Speech
    speak(text: string, options: { rate?: number; pitch?: number; volume?: number } = {}) {
        if (this.synthesis.speaking) {
            this.synthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options.rate || 0.9;
        utterance.pitch = options.pitch || 1;
        utterance.volume = options.volume || 0.8;

        // Use a more natural voice if available
        const voices = this.synthesis.getVoices();
        const preferredVoice = voices.find(voice => 
            voice.name.includes('Neural') || 
            voice.name.includes('Enhanced') ||
            voice.localService
        );
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        this.synthesis.speak(utterance);
        return utterance;
    }

    stopSpeaking() {
        if (this.synthesis.speaking) {
            this.synthesis.cancel();
        }
    }

    // Speech-to-Text
    async startListening(callbacks: {
        onTranscript: (transcript: string) => void;
        onRecordingState: (isRecording: boolean) => void;
    }) {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            throw new Error('Speech recognition not supported');
        }

        // Request microphone permission
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
        } catch (error) {
            throw new Error('Microphone access denied');
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.onTranscriptCallback = callbacks.onTranscript;
        this.onRecordingStateCallback = callbacks.onRecordingState;

        this.recognition.onstart = () => {
            this.onRecordingStateCallback?.(true);
        };

        this.recognition.onresult = (event: SpeechRecognitionEvent) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = 0; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }

            this.onTranscriptCallback?.(finalTranscript.trim() || interimTranscript);
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event);
            this.onRecordingStateCallback?.(false);
        };

        this.recognition.onend = () => {
            this.onRecordingStateCallback?.(false);
        };

        this.recognition.start();
    }

    stopListening() {
        if (this.recognition) {
            this.recognition.stop();
            this.recognition = null;
        }
    }
}

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

// Enhanced Action interface
interface EnhancedAction extends Action {
    status?: 'pending' | 'executing' | 'completed' | 'error';
    result?: string;
    error?: string;
    icon?: ReactNode;
}

export default function Spotlight() {
    // Voice and Input States
    const [isRecording, setIsRecording] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    
    // Actions and Processing
    const [actions, setActions] = useState<EnhancedAction[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingMessage, setProcessingMessage] = useState('');
    
    // Settings
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [autoExecute, setAutoExecute] = useState(false);
    const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
    
    // Refs
    const voiceServiceRef = useRef<VoiceService | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Initialize voice service
    useEffect(() => {
        voiceServiceRef.current = new VoiceService();
        checkMicPermissions();
        
        return () => {
            voiceServiceRef.current?.stopListening();
            voiceServiceRef.current?.stopSpeaking();
        };
    }, []);

    // Check microphone permissions
    const checkMicPermissions = async () => {
        try {
            if (navigator.permissions) {
                const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
                setMicPermission(permission.state);
            }
        } catch (error) {
            console.log('Permission API not supported');
        }
    };

    // Handle voice transcript updates
    const handleTranscript = (transcript: string) => {
        if (transcript.trim()) {
            setSearchQuery(transcript.trim());
            setInterimTranscript('');
        } else {
            setInterimTranscript(transcript);
        }
    };

    // Start voice recording
    const startRecording = async () => {
        if (!voiceServiceRef.current) return;

        try {
            await voiceServiceRef.current.startListening({
                onTranscript: handleTranscript,
                onRecordingState: setIsRecording
            });
            setMicPermission('granted');
        } catch (error) {
            console.error('Failed to start recording:', error);
            setMicPermission('denied');
            speak('Microphone access is required for voice input.');
        }
    };

    // Stop voice recording
    const stopRecording = () => {
        voiceServiceRef.current?.stopListening();
        setIsRecording(false);
    };

    // Handle microphone button click
    const handleMicClick = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    // Text-to-speech function
    const speak = (text: string) => {
        if (voiceEnabled && voiceServiceRef.current) {
            setIsSpeaking(true);
            const utterance = voiceServiceRef.current.speak(text);
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);
        }
    };

    // Stop speaking
    const stopSpeaking = () => {
        voiceServiceRef.current?.stopSpeaking();
        setIsSpeaking(false);
    };

    // Get appropriate icon for action
    const getActionIcon = (actionId: string): ReactNode => {
        const iconMap: { [key: string]: ReactNode } = {
            create_file: <FileIcon className="size-4" />,
            open_file: <FileIcon className="size-4" />,
            search: <FileIcon className="size-4" />,
            default: <FileIcon className="size-4" />
        };
        return iconMap[actionId] || iconMap.default;
    };

    // Process command with enhanced functionality
    const processSearchQuery = async () => {
        if (!searchQuery.trim()) return;

        setIsProcessing(true);
        setProcessingMessage('Processing your request...');

        try {
            // Stop any current recording/speaking
            stopRecording();
            stopSpeaking();

            // Process the command
            const result = await processCommand(searchQuery.trim());

            if (result && Array.isArray(result) && result.length > 0) {
                // Enhance actions with icons and status
                const enhancedActions: EnhancedAction[] = result.map(action => ({
                    ...action,
                    status: 'pending',
                    icon: getActionIcon(action.id)
                }));

                setActions(enhancedActions);
                setProcessingMessage(`Found ${result.length} action(s) to execute`);

                // Provide voice feedback
                if (voiceEnabled) {
                    speak(`Found ${result.length} actions. ${autoExecute ? 'Executing now.' : 'Ready to execute.'}`);
                }

                // Auto-execute if enabled
                if (autoExecute) {
                    await executeActions(enhancedActions);
                }
            } else {
                setActions([]);
                setProcessingMessage('No actions found for this command');
                if (voiceEnabled) {
                    speak('No actions found for this command.');
                }
            }
        } catch (error) {
            console.error('Error processing command:', error);
            setProcessingMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            if (voiceEnabled) {
                speak('Sorry, there was an error processing your command.');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    // Execute actions with status updates
    const executeActions = async (actionsToExecute: EnhancedAction[]) => {
        setProcessingMessage('Executing actions...');
        
        for (let i = 0; i < actionsToExecute.length; i++) {
            const action = actionsToExecute[i];
            
            // Update action status to executing
            setActions(prev => prev.map(a => 
                a.id === action.id ? { ...a, status: 'executing' } : a
            ));

            try {
                // Simulate action execution (replace with actual execution logic)
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Update action status to completed
                setActions(prev => prev.map(a => 
                    a.id === action.id ? { ...a, status: 'completed', result: 'Success' } : a
                ));
            } catch (error) {
                // Update action status to error
                setActions(prev => prev.map(a => 
                    a.id === action.id ? { 
                        ...a, 
                        status: 'error', 
                        error: error instanceof Error ? error.message : 'Unknown error'
                    } : a
                ));
            }
        }

        setProcessingMessage('All actions completed');
        if (voiceEnabled) {
            speak('All actions have been completed.');
        }
    };

    // Handle input changes
    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);

        // Stop recording if user starts typing
        if (isRecording && value.length > 0) {
            stopRecording();
        }
    };

    // Handle input focus
    const handleInputFocus = () => {
        if (searchQuery.length === 0 && !isRecording && micPermission === 'granted') {
            startRecording();
        }
    };

    // Handle Enter key press
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            processSearchQuery();
        }
    };

    // Get status color for actions
    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'executing': return 'text-yellow-400';
            case 'completed': return 'text-green-400';
            case 'error': return 'text-red-400';
            default: return 'text-gray-300';
        }
    };

    // Get status indicator
    const getStatusIndicator = (status?: string) => {
        switch (status) {
            case 'executing': return <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />;
            case 'completed': return <div className="w-2 h-2 bg-green-400 rounded-full" />;
            case 'error': return <div className="w-2 h-2 bg-red-400 rounded-full" />;
            default: return <div className="w-2 h-2 bg-gray-400 rounded-full" />;
        }
    };

    function handleParrotClick() {
        location.reload();
    }

    return (
        <div className="flex flex-col w-full rounded-lg px-3 py-4 gap-3 bg-neutral-900/70 border-white/20 border-2">
            {/* Search bar */}
            <div className="flex items-center gap-3">
                <button id = "parrot-button" onClick = {handleParrotClick}>
                    <img src="parrot.png" width={30} height={30} alt="Assistant" />
                </button>
                <input 
                    ref={inputRef}
                    placeholder={isRecording ? "Listening... Speak now" : "Search or speak..."}
                    value={searchQuery || interimTranscript}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onKeyDown={handleKeyDown}
                    className="w-full font-mono outline-none bg-transparent text-white placeholder:text-gray-400"
                />

                {/* Voice Controls */}
                <div className="flex items-center gap-2">
                    {/* Speaker toggle */}
                    <button
                        onClick={() => voiceEnabled ? stopSpeaking() : setVoiceEnabled(true)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${
                            isSpeaking
                                ? 'bg-blue-500/20 text-blue-400 ring-2 ring-blue-500/50'
                                : voiceEnabled
                                ? 'bg-white/10 text-neutral-400 hover:bg-white/20 hover:text-neutral-300'
                                : 'bg-red-500/20 text-red-400'
                        }`}
                        title={isSpeaking ? 'Stop speaking' : voiceEnabled ? 'Voice enabled' : 'Voice disabled'}
                    >
                        {isSpeaking ? (
                            <div className="flex items-center">
                                <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
                            </div>
                        ) : voiceEnabled ? (
                            <Volume2Icon className="h-4 w-4" />
                        ) : (
                            <VolumeXIcon className="h-4 w-4" />
                        )}
                    </button>

                    {/* Microphone button */}
                    <button
                        onClick={handleMicClick}
                        disabled={micPermission === 'denied'}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${
                            isRecording
                                ? 'bg-red-500/20 text-red-400 ring-2 ring-red-500/50'
                                : micPermission === 'denied'
                                ? 'bg-red-500/20 text-red-400 opacity-50 cursor-not-allowed'
                                : 'bg-white/10 text-neutral-400 hover:bg-white/20 hover:text-neutral-300'
                        }`}
                        title={
                            micPermission === 'denied' 
                                ? 'Microphone access denied'
                                : isRecording 
                                ? 'Stop recording' 
                                : 'Start voice input'
                        }
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
                </div>
            </div>

            {/* Settings Toggle */}
            <div className="flex items-center gap-4 text-xs text-gray-400">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={voiceEnabled}
                        onChange={(e) => setVoiceEnabled(e.target.checked)}
                        className="w-3 h-3"
                    />
                    Voice feedback
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={autoExecute}
                        onChange={(e) => setAutoExecute(e.target.checked)}
                        className="w-3 h-3"
                    />
                    Auto-execute
                </label>
            </div>

            {/* Processing Status */}
            {isProcessing && (
                <div className="flex items-center gap-3 px-3 py-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-blue-400 text-sm">{processingMessage}</span>
                </div>
            )}

            {/* Action List */}
            {actions.length > 0 && (
                <div className="flex flex-col gap-2 rounded-lg p-4 bg-neutral-700/90">
                    <div className="flex items-center justify-between">
                        <p className="text-white">Actions to execute:</p>
                        {!autoExecute && (
                            <button
                                onClick={() => executeActions(actions)}
                                disabled={isProcessing}
                                className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
                            >
                                <PlayIcon className="w-3 h-3" />
                                Execute All
                            </button>
                        )}
                    </div>
                    
                    <div className="px-2 font-mono text-sm space-y-2">
                        {actions.map((action, index) => (
                            <div key={`${action.id}-${index}`} className="flex gap-3 items-center py-2 px-3 bg-neutral-800/50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    {getStatusIndicator(action.status)}
                                    {action.icon}
                                </div>
                                <div className="flex-1">
                                    <p className="text-white font-medium">{action.id}</p>
                                    {action.description && (
                                        <p className={`text-sm ${getStatusColor(action.status)}`}>
                                            {action.description}
                                        </p>
                                    )}
                                    {action.result && (
                                        <p className="text-xs text-green-400 mt-1">✓ {action.result}</p>
                                    )}
                                    {action.error && (
                                        <p className="text-xs text-red-400 mt-1">✗ {action.error}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}