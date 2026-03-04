import { Request, Response } from 'express';
import pool from '../db.js';

/**
 * POST /webhook
 * Guarda un evento enviado por un cliente en la base de datos de Assetto Corsa
 */
export const saveWebhookEvent = async (req: Request, res: Response) => {
    try {
        const { serverName, webhookUrl, webhookSecret, metadata } = req.body;

        if (!serverName) {
            return res.status(400).json({ error: 'Falta proveer el nombre del servidor (serverName)' });
        }

        const eventType = metadata?.eventType || "unknown";

        await pool.query(
            `INSERT INTO server_events (server_name, webhook_url, event_type, metadata)
             VALUES (?, ?, ?, ?)`,
            [
                serverName,
                webhookUrl || null,
                eventType,
                JSON.stringify(metadata || {})
            ]
        );

        console.log(`📥 [Webhook] Evento guardado: ${eventType} desde ${serverName}`);
        res.status(201).json({ message: 'Evento guardado exitosamente' });

    } catch (err) {
        console.error('Error saveWebhookEvent:', err);
        res.status(500).json({ error: 'Error al guardar el evento de webhook' });
    }
};
