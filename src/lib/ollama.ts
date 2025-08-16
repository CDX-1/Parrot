import { ActionResponseSchema, Action } from './actions';
import { invoke } from '@tauri-apps/api/core';
import { z } from 'zod';
import { executeActions } from './executor';

export interface OllamaResponse {
    actions: Action[],
    summary: string,
    executor: () => Promise<OllamaResponse | null>
}

const generateContext = async () => {
    const baseContext: { role: string, content: string }[] = [
        {
            'role': 'system',
            'content': `You are a friendly AI assistant who helps the user manage their desktop computer. Do not add unnecessary actions.`
        },
        {
            'role': 'system', 
            'content': `When generating file paths, act as if you are in the user's home directory. 
                You can directly access folders using forward slashes without prefixes like '~' or '@'.`
        }
    ];

    // Fetch context from the system (ex: installed programs, processes)
    

    const installed_apps = await invoke('get_installed_programs');
    baseContext.push({
        role: 'system',
        content: `Here is a list of installed programs in JSON, this may be needed in your response or it may be unnecessary: ${JSON.stringify(installed_apps)}`
    });

    return baseContext;
}

// TODO: Return a callback so that actions can be manually executed by the user once generated
export const processCommand = async (command: string, model: string = "gemma3:12b-it-qat", context: string[] = []): Promise<OllamaResponse | null> => {
    const joinedMessages = [
        ...(await generateContext()),
        ...context,
        {
            'role': 'user',
            'content': command
        }
    ];
    const response = await invoke('process_ollama_command', {
        model: model,
        messages: joinedMessages,
        schema: JSON.stringify(z.toJSONSchema(ActionResponseSchema))
    });

    if (!response || typeof (response) !== "string") {
        return null;
    }

    const parseResult = ActionResponseSchema.safeParse(JSON.parse(response));
    if (!parseResult.success) {
        return null;
    }

    const actions = parseResult.data.actions;

    return {
        actions: actions,
        summary: parseResult.data.summary,
        executor: async () => {
            const fetched = await executeActions(actions);
            console.log(fetched);
            if (fetched.length > 0) {
                return processCommand(
                    "You've been provided more context",
                    model,
                    fetched.map((f) => JSON.stringify(f))
                );
            }
            return null;
        }
    };
}