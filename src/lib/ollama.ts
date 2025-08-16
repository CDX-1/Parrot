import { ActionResponseSchema, Action } from './actions';
import { invoke } from '@tauri-apps/api/core';
import { z } from 'zod';
import { executeActions } from './executor';

const history: { role: string, content: string }[] = [];

export interface OllamaResponse {
    actions: Action[],
    summary: string,
    executor: () => Promise<OllamaResponse | null>
}

const generateContext = () => {
    const baseContext: { role: string, content: string }[] = [
        {
            'role': 'system',
            'content': `You are a friendly AI assistant who helps the user manage their desktop computer. 
                You have access to various actions including file operations, web searches, and system information gathering.
                
                If you don't have enough information to complete a request, use actions that are prefixed with 'request_' in order to
                request more information from the system to complete the original request. Please ensure that you do not submit any
                actions other than request actions if you are making a request unless necessary.
                - request_list_files: Request lstat of the providied file or directory

                If a request is provided, you will be reprompted with the retrieved information
                
                Only respond with schema matching JSON. Do not add unnecessary actions.`
        },
        {
            'role': 'system', 
            'content': `When generating file paths, act as if you are in the user's home directory. 
                You can directly access folders using forward slashes without prefixes like '~' or '@'.`
        }
    ];

    // Fetch context from the system (ex: installed programs, processes,)


    for (const message of history) {
        baseContext.push(message);
    }

    return baseContext;
}

// TODO: Return a callback so that actions can be manually executed by the user once generated
export const processCommand = async (command: string, model: string = "llama3.1:8b-instruct-q4_0", context: string[] = []): Promise<OllamaResponse | null> => {
    history.push({ role: 'user', content: command });

    const response = await invoke('process_ollama_command', {
        model: model,
        messages: [
            ...generateContext(),
            ...context,
            {
                'role': 'user',
                'content': command
            }
        ], schema: JSON.stringify(z.toJSONSchema(ActionResponseSchema))
    });

    if (!response || typeof (response) !== "string") {
        return null;
    }

    const parseResult = ActionResponseSchema.safeParse(JSON.parse(response));
    if (!parseResult.success) {
        return null;
    }

    history.push({ role: 'assistant', content: response });
    const actions = parseResult.data.actions;
    console.log(parseResult.data);

    return {
        actions: actions,
        summary: parseResult.data.summary,
        executor: async () => {
            const fetched = await executeActions(actions);
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