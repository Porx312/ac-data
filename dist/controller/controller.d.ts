import { Request, Response } from 'express';
export declare const startServer: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const stopServer: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const restartServer: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const serverStatus: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const setPassword: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
export declare const setTrack: (req: Request, res: Response) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=controller.d.ts.map