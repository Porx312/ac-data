import { Request, Response } from 'express';
/**
 * POST /webhook
 * Guarda un evento enviado por un cliente en la base de datos de Assetto Corsa
 */
export declare const saveWebhookEvent: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /battles/webhook
 * Guarda una configuración activa de Touge Battle en la base de datos de Assetto Corsa
 */
export declare const saveBattleWebhook: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * POST /server-event
 * Recibe eventos en tiempo real de Assetto Corsa (player_join, player_leave, lap_completed, server_status)
 */
export declare const receiveServerEvent: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=webhookController.d.ts.map