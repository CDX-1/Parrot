import { z } from 'zod';

const UrlParameterDescription = "A fully qualified URL";
const PathParameterDescription = "A path in the users file system";

export const OpenUrlActionSchema = z.object({
    id: z.literal("open_url").describe("Open a URL in the users default browser"),
    description: z.string(),
    url: z.string().describe(UrlParameterDescription)
});

export const ExecuteFileActionSchema = z.object({
    id: z.literal("execute_file").describe("Execute a file using the defualt linked program"),
    description: z.string(),
    path: z.string().describe(PathParameterDescription)
});

export const RevealPathActionSchema = z.object({
    id: z.literal("reveal_path").describe("Reveal the specified folder or file in the users file explorer"),
    description: z.string(),
    path: z.string().describe(PathParameterDescription)
});

export const CreateFileActionSchema = z.object({
    id: z.literal("create_file"),
    description: z.string(),
    path: z.string().describe(PathParameterDescription),
    content: z.string().nullable().describe("The content that the file should be initialized with, nullable"),
    overwrite: z.boolean().describe("Whether the file should be overidden in the case that it already exists, should typically be false unless necessary")
});
export type CreateFileAction = z.infer<typeof CreateFileActionSchema>;

export const ActionSchema = z.discriminatedUnion('id', [OpenUrlActionSchema, ExecuteFileActionSchema, RevealPathActionSchema, CreateFileActionSchema]);
export const ActionResponseSchema = z.object({
    summary: z.string().describe("A brief summary of the actions that are to be executed"),
    actions: z.array(ActionSchema).describe("A list of the actions to execute")
});
export type Action = z.infer<typeof ActionSchema>;
export type ActionResponse = z.infer<typeof ActionResponseSchema>;
