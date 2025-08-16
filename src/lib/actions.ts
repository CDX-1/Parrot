import { z } from 'zod';

const UrlParameterDescription = "A fully qualified URL";
const PathParameterDescription = "A path in the users file system";

// ====================== ACTIONS ======================

export const DisplayTextActionSchema = z.object({
    id: z.literal("display_text").describe("Displays a body of text to the user"),
    description: z.string(),
    content: z.string().describe("The body of text to display")
});

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

// ====================== REQUEST ======================

export const ListFilesActionSchema = z.object({
    id: z.literal("request_list_files").describe("List files and directories in a specified path"),
    description: z.string(),
    path: z.string().describe(PathParameterDescription),
    pattern: z.string().optional().describe("File pattern to match (e.g., '*.txt', '*.js')")
});

export const FileListResult = z.object({
    files: z.array(z.object({
        name: z.string(),
        path: z.string(),
        is_directory: z.boolean(),
        size: z.number().optional()
    })),
    total_count: z.number()
});

// ====================== RESPONSE ======================

export const ActionSchema = z.discriminatedUnion('id', [
    DisplayTextActionSchema,
    OpenUrlActionSchema,
    ExecuteFileActionSchema,
    RevealPathActionSchema,
    CreateFileActionSchema,

    ListFilesActionSchema
]);
export const ActionResponseSchema = z.object({
    summary: z.string().describe("A brief summary of the actions that are to be executed"),
    actions: z.array(ActionSchema).describe("A list of the actions to execute")
});
export type Action = z.infer<typeof ActionSchema>;
export type ActionResponse = z.infer<typeof ActionResponseSchema>;
