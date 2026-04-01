import pool from '../db.js';
/**
 * POST /webhook
 * Guarda un evento enviado por un cliente en la base de datos de Assetto Corsa
 */
export const saveWebhookEvent = async (req, res) => {
    try {
        const { serverName, webhookUrl, metadata } = req.body;
        if (!serverName) {
            return res.status(400).json({ error: 'Falta proveer el nombre del servidor (serverName)' });
        }
        const eventType = metadata?.eventType || "unknown";
        const eventId = metadata?.eventId || null;
        const eventStatus = req.body.eventStatus || metadata?.eventStatus || "started";
        await pool.query(`INSERT INTO server_events (event_id, server_name, webhook_url, event_type, event_status, metadata)
             VALUES (?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
                server_name = VALUES(server_name),
                webhook_url = VALUES(webhook_url),
                event_type = VALUES(event_type),
                event_status = VALUES(event_status),
                metadata = VALUES(metadata)`, [
            eventId,
            serverName,
            webhookUrl || null,
            eventType,
            eventStatus,
            JSON.stringify(metadata || {})
        ]);
        console.log(`📥 [Webhook] Evento guardado: ${eventType} desde ${serverName}`);
        res.status(201).json({ message: 'Evento guardado exitosamente' });
    }
    catch (err) {
        console.error('Error saveWebhookEvent:', err);
        res.status(500).json({ error: 'Error al guardar el evento de webhook' });
    }
};
//# sourceMappingURL=webhookController.js.map