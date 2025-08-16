import { z } from 'zod';

export const OpenUrlActionSchema = z.object({
    id: z.literal("open_url"),
    description: z.string(),
    url: z.string().describe("A fully qualified URL")
});

export const ExecuteFileActionSchema = z.object({
    id: z.literal("execute_path"),
    description: z.string(),
    path: z.string().describe("A fully qualified path in the users file system")
});

export const RevealPathActionSchema = z.object({
    id: z.literal("reveal_path"),
    description: z.string(),
    path: z.string().describe("A fully qualified path in the users file system")
});

export const CreateFileActionSchema = z.object({
    id: z.literal("create_file"),
    description: z.string(),
    path: z.string().describe("A fully qualified path in the users file system"),
    content: z.string().describe("The content that the file should be initialized with")
});

export const ActionSchema = z.discriminatedUnion('id', [OpenUrlActionSchema, ExecuteFileActionSchema, CreateFileActionSchema]);
export const ActionResponseSchema = z.object({
    actions: z.array(ActionSchema)
});
export type Action = z.infer<typeof ActionSchema>;
export type ActionResponse = z.infer<typeof ActionResponseSchema>;