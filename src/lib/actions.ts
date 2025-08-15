import { z } from 'zod';

export const OpenUrlActionSchema = z.object({
    id: z.literal("open_url"),
    description: z.string(),
    url: z.string()
});

export const ActionSchema = z.discriminatedUnion('id', [ OpenUrlActionSchema ]);
export const ActionResponseSchema = z.object({
    actions: z.array(ActionSchema) 
});
export type Action = z.infer<typeof ActionSchema>;
export type ActionResponse = z.infer<typeof ActionResponseSchema>;