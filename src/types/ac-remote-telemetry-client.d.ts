declare module 'ac-remote-telemetry-client' {
    import { EventEmitter } from 'events';

    export interface HandshakerResponse {
        carName: string;
        driverName: string;
        trackName: string;
        trackConfig: string;
    }

    export interface RTCarInfo {
        identifier: number;
        size: number;
        speedKmh: number;
        speedMph: number;
        speedMs: number;
        isAbsEnabled: boolean;
        isAbsInAction: boolean;
        isTcInAction: boolean;
        isTcEnabled: boolean;
        isInPit: boolean;
        isEngineInLimiter: boolean;
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
        wheelAngularSpeed: number[];
        slipAngle: number[];
        slipAngleContactPatch: number[];
        slipRatio: number[];
        tyreSlip: number[];
        ndSlip: number[];
        load: number[];
        Dy: number[];
        Mz: number[];
        tyreDirtyLevel: number[];
        camberRAD: number[];
        tyreRadius: number[];
        tyreLoadedRadius: number[];
        suspensionHeight: number[];
        carPositionNormalized: number;
        carSlope: number;
        carCoordinates: number[];
    }

    export interface RTLap {
        carIdentifierNumber: number;
        lap: number;
        driverName: string;
        carName: string;
        time: number;
    }

    export class ACRemoteTelemetryClient extends EventEmitter {
        constructor(options?: { host?: string; port?: number });
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
}
