export enum ACSP {
    // Outgoing (Backend -> Server)
    SUBSCRIBE_UPDATE = 200,
    SUBSCRIBE_SPOT = 201,
    SEND_CHAT = 220,
    BROADCAST_CHAT = 221,
    GET_CAR_INFO = 210,
    GET_SESSION_INFO = 211,

    // Incoming (Server -> Backend)
    NEW_SESSION = 50,
    NEW_CAR_CONNECTION = 51,
    CAR_DISCONNECTED = 52,
    LAP_COMPLETED = 58,
    CAR_UPDATE = 54,
    COLLISION_WITH_CAR = 59,
    COLLISION_WITH_ENV = 60,
    CLIENT_EVENT = 130, // Custom often used for chat/commands
}

export interface ACSPNewSession {
    protocolVersion: number;
    sessionIndex: number;
    currentSessionIndex: number;
    sessionCount: number;
    serverName: string;
    trackName: string;
    trackConfig: string;
    name: string;
    type: number;
    time: number;
    laps: number;
    wait: number;
}

export interface ACSPNewCarConnection {
    carId: number;
    carModel: string;
    carSkin: string;
    driverName: string;
    driverTeam: string;
    driverGuid: string;
}

export interface ACSPLapCompleted {
    carId: number;
    lapTime: number;
    cuts: number;
    carsCount: number;
    leaderboard: { carId: number; time: number; laps: number }[];
}
