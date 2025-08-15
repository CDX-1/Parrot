import { zodToJsonSchema } from 'zod-to-json-schema';
import { ActionResponseSchema, Action } from './actions';
import { invoke } from '@tauri-apps/api/core';
import { z } from 'zod';

const generateContext = () => {
    return [
        { 'role': 'system', 'content': 'You are a friendly AI assistant who helps the user manage their desktop computer, do not add unnecessary actions.' }
    ];
}

export const processCommand = async (command: string): Promise<Action[] | null> => {
    console.log(JSON.stringify(zodToJsonSchema(ActionResponseSchema)));

    const response = await invoke('process_ollama_command', { messages: [
        ...generateContext(),
        {
            'role': 'user',
            'content': command
        }
    ], schema: JSON.stringify(z.toJSONSchema(ActionResponseSchema)) });

    if (!response || typeof(response) !== "string") {
        return null;
    }

    const parseResult = ActionResponseSchema.safeParse(JSON.parse(response));
    if (!parseResult.success) {
        return null;
    }

    return parseResult.data.actions;
}