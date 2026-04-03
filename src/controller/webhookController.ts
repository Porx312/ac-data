import { Request, Response } from 'express';
import { db } from '../db.js';
import { serverBattles, serverEvents } from '../db/schema.js';

/**
 * POST /webhook
 * Guarda un evento enviado por un cliente en la base de datos de Assetto Corsa
 */
export const saveWebhookEvent = async (req: Request, res: Response) => {
    try {
        const { serverName, webhookUrl, metadata, eventId: bodyEventId, eventType: bodyEventType, eventStatus: bodyEventStatus } = req.body;

        if (!serverName) {
            return res.status(400).json({ error: 'Falta proveer el nombre del servidor (serverName)' });
        }

        const eventType = bodyEventType || metadata?.eventType || 'unknown';
        const eventId = bodyEventId || metadata?.eventId || null;
        const eventStatus = bodyEventStatus || metadata?.eventStatus || 'started';

        const meta = (metadata ?? {}) as Record<string, unknown>;

        await db
            .insert(serverEvents)
            .values({
                eventId,
                serverName,
                webhookUrl: webhookUrl ?? null,
                eventType,
                eventStatus,
                metadata: meta,
                updatedAt: new Date(),
            })
            .onConflictDoUpdate({
                target: serverEvents.eventId,
                set: {
                    serverName,
                    webhookUrl: webhookUrl ?? null,
                    eventType,
                    eventStatus,
                    metadata: meta,
                    updatedAt: new Date(),
                },
            });

        console.log(`📥 [Webhook] Evento guardado: ${eventType} desde ${serverName}`);
        res.status(201).json({ message: 'Evento guardado exitosamente' });
    } catch (err) {
        console.error('Error saveWebhookEvent:', err);
        res.status(500).json({ error: 'Error al guardar el evento de webhook' });
    }
};

/**
 * POST /battles/webhook
 * Guarda una configuración activa de Touge Battle en la base de datos de Assetto Corsa
 */
export const saveBattleWebhook = async (req: Request, res: Response) => {
    try {
        const { battleId, serverName, player1SteamId, player2SteamId, webhookUrl, webhookSecret, metadata, status } = req.body;

        if (!serverName) {
            return res.status(400).json({ error: 'Falta proveer el nombre del servidor (serverName)' });
        }
        if (!battleId || !player1SteamId || !player2SteamId) {
            return res.status(400).json({ error: 'Faltan campos requeridos (battleId, player1SteamId, player2SteamId)' });
        }

        const battleStatus = status || 'active';
        const meta = (metadata ?? {}) as Record<string, unknown>;

        await db
            .insert(serverBattles)
            .values({
                battleId,
                serverName,
                webhookUrl: webhookUrl ?? null,
                webhookSecret: webhookSecret ?? null,
                player1SteamId,
                player2SteamId,
                status: battleStatus,
                metadata: meta,
                updatedAt: new Date(),
            })
            .onConflictDoUpdate({
                target: serverBattles.battleId,
                set: {
                    serverName,
                    webhookUrl: webhookUrl ?? null,
                    webhookSecret: webhookSecret ?? null,
                    player1SteamId,
                    player2SteamId,
                    status: battleStatus,
                    metadata: meta,
                    updatedAt: new Date(),
                },
            });

        console.log(`📥 [Webhook] Batalla guardada: ${battleId} en ${serverName} (Estado: ${battleStatus})`);
        res.status(201).json({ message: 'Batalla guardada exitosamente' });
    } catch (err) {
        console.error('Error saveBattleWebhook:', err);
        res.status(500).json({ error: 'Error al guardar la batalla de webhook' });
    }
};

/**
 * POST /server-event
 * Recibe eventos en tiempo real de Assetto Corsa (player_join, player_leave, lap_completed, server_status)
 */
export const receiveServerEvent = async (req: Request, res: Response) => {
    try {
        const secret = req.headers['x-webhook-secret'];
        if (secret !== process.env.BATTLE_WEBHOOK_SECRET) {
            return res.status(401).json({ error: 'Mala autorización: webhook secret incorrecto' });
        }

        const { event, serverName, data } = req.body;

        if (!event || !data) {
            return res.status(400).json({ error: 'Payload incompleto. Se requiere "event" y "data".' });
        }

        switch (event) {
            case 'player_join':
                console.log(`🔌 [SeverEvent] ${data.name} (${data.steamId}) entró a ${serverName} con un ${data.carModel}`);
                break;

            case 'player_leave':
                console.log(`👋 [SeverEvent] El jugador ${data.steamId} abandonó ${serverName}`);
                break;

            case 'lap_completed':
                console.log(`⏱️ [SeverEvent] Tiempo marcado: ${data.steamId} hizo ${data.lapTime}ms en ${data.trackName}`);
                break;

            case 'server_status':
                console.log(`🔄 [SeverEvent] Sincronización de lista de jugadores en ${serverName}: ${data.players.length} conectados.`);
                break;

            default:
                console.log(`⚠️ [SeverEvent] Tipo de evento desconocido: ${event}`);
                return res.status(400).json({ error: 'Evento desconocido' });
        }

        res.status(200).json({ message: 'Evento procesado correctamente' });
    } catch (err) {
        console.error('Error receiveServerEvent:', err);
        res.status(500).json({ error: 'Error interno procesando evento de servidor' });
    }
};
