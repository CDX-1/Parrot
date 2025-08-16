import { openPath, openUrl, revealItemInDir } from "@tauri-apps/plugin-opener";
import { path } from "@tauri-apps/api";
import { Action } from "./actions";
import { create, exists, open } from "@tauri-apps/plugin-fs";

type ActionExecutor<T extends Action = Action> = (action: T) => Promise<void> | void;

const actionExecutors: {
    [K in Action['id']]: ActionExecutor<Extract<Action, { id: K }>>;
} = {
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
        let fixedPath = action.path;
        if (action.path.startsWith('~/')) {
            fixedPath = action.path.slice(1);
        }

        const homeDir = await path.homeDir();
        const exactPath = await path.join(homeDir, fixedPath);

        console.log(exactPath);

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
    }
};

export const executeActions = async (actions: Action[]) => {
    await Promise.all(actions.map(action =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        actionExecutors[action.id](action as any)
    ));
};