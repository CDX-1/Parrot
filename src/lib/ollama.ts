import { ActionResponseSchema, Action } from './actions';
import { invoke } from '@tauri-apps/api/core';
import { z } from 'zod';
import { executeActions } from './executor';

const generateContext = () => {
    return [
        {
            'role': 'system',
            'content': `You are a friendly AI assistant who helps the user manage their desktop computer, do not add unnecessary actions.
                It is okay to return no actions if you think that you do not have any matching actions. Do not mess up the users computer.
                Only respond with schema matching JSON.`
        },
        {
            'role': 'system',
            'content': `When you are generating file paths, act as if you are in the users home directory. Prefixes to signify your position such as '~' or '@' are unnecessary, you can directly access folders by just using a forward slash.'`
        }
    ];
}

export const processCommand = async (command: string): Promise<Action[] | null> => {
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

    const actions = parseResult.data.actions;
    executeActions(actions);
    return actions;
}