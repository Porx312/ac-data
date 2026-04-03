/**
 * Identificador de este proceso / VPS. Las filas en `ac_server_control` con el mismo
 * `instance_id` son las únicas que este nodo aplica.
 *
 * Prioridad: AC_INSTANCE_ID → VPS_ID → "default"
 */
export function getAcInstanceId(): string {
    const id = process.env.AC_INSTANCE_ID?.trim() || process.env.VPS_ID?.trim();
    return id && id.length > 0 ? id : 'default';
}
