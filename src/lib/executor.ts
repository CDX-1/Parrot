import { openUrl } from "@tauri-apps/plugin-opener";
import { Action } from "./actions";

type ActionExecutor<T extends Action = Action> = (action: T) => Promise<void> | void;

const actionExecutors: {
    [K in Action['id']]: ActionExecutor<Extract<Action, { id: K }>>;
} = {
    open_url: async (action) => {
        await openUrl(action.url);
    },
    execute_file: async (action) => {
    },
    create_file: async (action) => {
    }
};

export const executeActions = async (actions: Action[]) => {
    await Promise.all(actions.map(action =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        actionExecutors[action.id](action as any)
    ));
};