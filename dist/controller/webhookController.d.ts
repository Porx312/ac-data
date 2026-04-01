import { Request, Response } from 'express';
/**
 * POST /webhook
 * Guarda un evento enviado por un cliente en la base de datos de Assetto Corsa
 */
export declare const saveWebhookEvent: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=webhookController.d.ts.map