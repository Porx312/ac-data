declare module 'ac-remote-telemetry-client' {
    import { EventEmitter } from 'events';

    export interface HandshakerResponse {
        carName: string;
        driverName: string;
        trackName: string;
        trackConfig: string;
    }

    export interface RTCarInfo {
        identifier: string;
        size: number;
        speedKmh: number;
        speedMph: number;
        speedMs: number;
        isAbsEnabled: number;
        isAbsInAction: number;
        isTcInAction: number;
        isTcEnabled: number;
        isInPit: number;
        isEngineLimiterOn: number;
        accGVertical: number;
        accGHorizontal: number;
        accGFrontal: number;
        lapTime: number;
        lastLap: number;
        bestLap: number;
        lapCount: number;
        gas: number;
        brake: number;
        clutch: number;
        engineRPM: number;
        steer: number;
        gear: number;
        cgHeight: number;
        wheelAngularSpeed1: number;
        wheelAngularSpeed2: number;
        wheelAngularSpeed3: number;
        wheelAngularSpeed4: number;
        slipAngle1: number;
        slipAngle2: number;
        slipAngle3: number;
        slipAngle4: number;
        // ... (truncated for brevity, adding the most important ones for ranking)
        carPositionNormalized: number;
        carSlope: number;
        carCoordinatesX: number;
        carCoordinatesY: number;
        carCoordinatesZ: number;
    }

    export interface RTLap {
        carIdentifierNumber: number;
        lap: number;
        driverName: string;
        carName: string;
        time: number;
    }

    class ACRemoteTelemetryClient extends EventEmitter {
        constructor(acServerIp?: string);
        start(): void;
        stop(): void;
        handshake(): void;
        subscribeUpdate(): void;
        subscribeSpot(): void;

        on(event: 'HANDSHAKER_RESPONSE', listener: (data: HandshakerResponse) => void): this;
        on(event: 'RT_CAR_INFO', listener: (data: RTCarInfo) => void): this;
        on(event: 'RT_LAP', listener: (data: RTLap) => void): this;
        on(event: string | symbol, listener: (...args: any[]) => void): this;
    }

    export default ACRemoteTelemetryClient;
}
