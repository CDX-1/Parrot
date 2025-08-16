'use client';

import { FileIcon } from "lucide-react";
import { ReactNode, useState } from "react";

export default function Spotlight() {
    const [isRecording, setRecording] = useState(false);
    const [actions, setActions] = useState<{ id: string, description: string, icon: ReactNode }[]>([
        {
            id: 'create_file',
            description: 'this will create a new file',
            icon: <FileIcon className="size-4" />
        },
        {
            id: 'create_file',
            description: 'this will create a new file',
            icon: <FileIcon className="size-4" />
        },
        {
            id: 'create_file',
            description: 'this will create a new file',
            icon: <FileIcon className="size-4" />
        },
    ]);

    return (
        <div className="flex flex-col w-full rounded-lg px-3 py-4 gap-3 bg-neutral-900/70 border-white/20 border-2">
            {/* Search bar */}
            <div className="flex items-center gap-3">
                <img src="parrot.png" width={30} height={30} />
                <input placeholder="Search or speak..." className="w-full font-mono outline-none" />

                {/* Microphone button */}
                <button
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
            </div>

            {/* Action List */}
            {actions.length > 0 && (
                <div className="flex flex-col gap-2 rounded-lg p-4 bg-neutral-700/90">
                    <p>This action will run:</p>
                    <div className="px-2 font-mono text-sm">
                        {actions.map((action) => (
                            <div className="flex gap-3 items-center">
                                {action.icon}
                                <p>{action.id}</p>
                                <p className="text-gray-300">{action.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}