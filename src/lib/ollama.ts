import { ActionResponseSchema, Action } from './actions';
import { invoke } from '@tauri-apps/api/core';
import { z } from 'zod';
import { executeActions } from './executor';

// TODO: Retrieve 'requestedInfo' and append it to AI context, append history as 'user' messages
const history: { role: string, content: string }[] = [];

const generateContext = () => {
    const baseContext: { role: string, content: string }[] = [
        {
            'role': 'system',
            'content': `You are a friendly AI assistant who helps the user manage their desktop computer. 
                You have access to various actions including file operations, web searches, and system information gathering.
                
                If you don't have enough information to complete a request, use actions that are prefixed with 'request_' in order to
                request more information from the system to complete the original request. Please ensure that you do not submit any
                actions other than request actions if you are making a request unless necessary.
                - request_lstat: Request lstat of the providied file or directory
                
                Only respond with schema matching JSON. Do not add unnecessary actions.`
        },
        {
            'role': 'system', 
            'content': `When generating file paths, act as if you are in the user's home directory. 
                You can directly access folders using forward slashes without prefixes like '~' or '@'.`
        }
    ];

    for (const message of history) {
        baseContext.push(message);
    }

    return baseContext;
}

// TODO: Return a callback so that actions can be manually executed by the user once generated
export const processCommand = async (command: string): Promise<Action[] | null> => {
    history.push({ role: 'user', content: command });

    const response = await invoke('process_ollama_command', {
        model: "llama3.1:8b-instruct-q4_0",
        messages: [
            ...generateContext(),
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
    executeActions(actions);
    return actions;
}