import { openPath, openUrl, revealItemInDir } from "@tauri-apps/plugin-opener";
import { path } from "@tauri-apps/api";
import { Action } from "./actions";
import { create, exists, lstat, open } from "@tauri-apps/plugin-fs";

type ActionExecutor<T extends Action = Action> = (action: T) => Promise<void> | void;

async function resolvePath(p: string) {
    let fixedPath = p;
    if (p.startsWith('~/')) {
        fixedPath = p.slice(1);
    }

    const homeDir = await path.homeDir();
    const exactPath = await path.join(homeDir, fixedPath);
    return exactPath;
}

const actionExecutors: {
    [K in Action['id']]: ActionExecutor<Extract<Action, { id: K }>>;
} = {
    display_text: async (action) => {

    },
    open_url: async (action) => {
        await openUrl(action.url);
    },
    execute_file: async (action) => {
        await openPath(action.path);
    },
    reveal_path: async (action) => {
        await revealItemInDir(action.path);
    },
    create_file: async (action) => {
        const exactPath = await resolvePath(action.path);

        const pathExists = await exists(exactPath);
        if (pathExists && !action.overwrite) return;

        let file;
        if (!pathExists) {
            file = await create(exactPath);
        } else {
            file = await open(exactPath);
        }

        if (action.content) await file.write(new TextEncoder().encode(action.content));

        await file.close();
    },

    request_lstat: async (action) => {
        const file = await lstat(action.path);
        
    }
};

export const executeActions = async (actions: Action[]) => {
    await Promise.all(actions.map(action =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        actionExecutors[action.id](action as any)
    ));
};