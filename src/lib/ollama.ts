import { ActionResponseSchema, Action } from './actions';
import { invoke } from '@tauri-apps/api/core';
import { z } from 'zod';
import { executeActions } from './executor';

const generateContext = () => {
    return [
        { 'role': 'system', 'content': 'You are a friendly AI assistant who helps the user manage their desktop computer, do not add unnecessary actions. Do not mess up the users computer.' }
    ];
}

export const processCommand = async (command: string): Promise<Action[] | null> => {
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

    const actions = parseResult.data.actions;
    executeActions(actions);
    return actions;
}