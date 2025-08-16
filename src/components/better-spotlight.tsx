'use client';

import { OllamaResponse, processCommand } from "@/lib/ollama";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { ArrowRight, CheckCircle2Icon, TerminalSquareIcon } from "lucide-react";
import { Button } from "./ui/button";
import { titlecase } from "@/lib/utils";
import { Spinner } from "./ui/shadcn-io/spinner";

export default function Spotlight() {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<OllamaResponse | null>(null);

    const handleCommand = async () => {
        setLoading(true);
        try {
            const res = await processCommand(query);
            if (!res) throw Error("Model failed to provide a response");
            setResponse(res);
        } catch (e) {
            setResponse({
                actions: [],
                summary: `An error occurred: ${e}`,
                executor: async () => null
            });
        }
    }

    return (
        <div
            id="spotlight"
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[9999] flex items-start justify-center p-6 sm:p-8"
        >
            {/* Spotlight card */}
            <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-white/10 bg-neutral-900/70 shadow-2xl ring-1 ring-white/10">
                {/* Input row */}
                <div className="flex items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
                    {/* Parrot icon */}
                    <img src="parrot.png" width={30} height={30} />

                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search or speak..."
                        className="w-full bg-transparent text-base text-neutral-100 placeholder:text-neutral-500 outline-none"
                    />

                    {/* Microphone button */}
                    <button
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-neutral-400 hover:bg-white/20 hover:text-neutral-300 transition-all duration-200"
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
                                <div className="flex flex-col gap-3">
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
                        {loading && (
                            <>
                                <Spinner size={18} />
                                <p>Loading...</p>
                            </>
                        )}
                    </div>

                    <div className="flex gap-3 items-center">
                        <p className="text-muted-foreground text-sm">Press enter or</p>
                        <Button
                            size="sm"
                            variant="secondary"
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
    );
}