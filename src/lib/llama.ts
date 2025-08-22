import { invoke } from "@tauri-apps/api/core";
import z from "zod";

const schema = z.object({
    response: z.string()
});

export async function prompt(model: string, prompt: string): Promise<string> {
    const res = await invoke('prompt_llama', {
        model: model,
        messages: [
            {
                role: 'user',
                content: prompt
            }
        ],
        schema: JSON.stringify(z.toJSONSchema(schema))
    });

    return res as string;
}