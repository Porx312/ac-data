export declare const activeServers: Record<string, {
    pid: number;
} | undefined>;
export type ServerConfigPayload = {
    displayName?: string;
    password?: string;
    track?: string;
    configTrack?: string | null;
    maxClients?: number;
    entries?: Array<{
        model: string;
        skin?: string;
        count?: number;
    }>;
};
/** Escribe server_cfg.ini / entry_list.ini según payload (misma lógica que la antigua API). */
export declare function applyServerConfiguration(serverName: string, payload: ServerConfigPayload): {
    ok: true;
    modifications: string[];
} | {
    ok: false;
    reason: string;
};
export declare function startServerCore(serverName: string): {
    ok: boolean;
    message: string;
};
export declare function stopServerCore(serverName: string): Promise<{
    ok: boolean;
    message: string;
}>;
export declare function restartServerCore(serverName: string): Promise<{
    ok: boolean;
    message: string;
}>;
//# sourceMappingURL=controller.d.ts.map