import { Request, Response } from 'express';
import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const SERVERS_PATH = process.env.SERVERS_PATH;
if (!SERVERS_PATH) throw new Error('SERVERS_PATH no definido en .env');

// Registro persistente de servidores activos
const PIDS_FILE = path.join(process.cwd(), 'server_pids.json');

const loadPids = (): Record<string, { pid: number } | undefined> => {
  try {
    if (fs.existsSync(PIDS_FILE)) {
      return JSON.parse(fs.readFileSync(PIDS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error("Error cargando PIDs:", err);
  }
  return {};
};

const savePids = () => {
  try {
    fs.writeFileSync(PIDS_FILE, JSON.stringify(activeServers, null, 2), 'utf-8');
  } catch (err) {
    console.error("Error guardando PIDs:", err);
  }
};

const activeServers: Record<string, { pid: number } | undefined> = loadPids();

// ------------------------ SERVIDOR ------------------------

export const startServer = (req: Request, res: Response) => {
  const { serverName } = req.body;
  if (!serverName) return res.status(400).send('Se requiere serverName');

  const serverPath = path.join(SERVERS_PATH, serverName, 'acServer.exe');
  if (!fs.existsSync(serverPath)) return res.status(404).send('El servidor no existe');

  // Verificar si ya está activo
  if (activeServers[serverName]) return res.status(403).send('Servidor ya está activo');

  try {
    const acDir = path.dirname(serverPath);
    const server = spawn('cmd.exe', ['/c', `"${serverPath}"`], {
      cwd: acDir,
      shell: true,
      detached: true,
      stdio: 'inherit',
    });

    if (server.pid) {
      server.unref();
      activeServers[serverName] = { pid: server.pid };
      savePids();
      res.send(`Servidor ${serverName} iniciado (PID: ${server.pid})`);
    } else {
      res.status(500).send('Error al obtener PID del proceso');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al iniciar AC Server');
  }
};

export const stopServer = (req: Request, res: Response) => {
  const { serverName } = req.body;
  if (!serverName) return res.status(400).send('Se requiere serverName');

  const serverInfo = activeServers[serverName];

  if (!serverInfo || !serverInfo.pid) {
    // Si no teníamos idea de la ID (por un backend crash) y el dev trata de pararlo
    delete activeServers[serverName];
    savePids();
    return res.status(404).send(`Servidor ${serverName} no parece estar activo (PID perdido o nunca guardado).`);
  }

  // Usar /T para matar el árbol de procesos (cmd.exe -> acServer.exe)
  exec(`taskkill /PID ${serverInfo.pid} /T /F`, (err, stdout) => {
    if (err) {
      console.error(err);
      // Limpiamos de la memoria porque ya sabemos que el proceso murió o desapareció
      delete activeServers[serverName];
      savePids();

      // Si el error es simplemente 'proceso no encontrado', enviarlo como un Success a la UI
      // para no bloquear al usuario y destrabar la máquina de estados.
      if (err.message.includes('not found') || err.message.includes('no encontrado')) {
        return res.status(200).send(`El proceso ya no existía en el sistema operativo. Hemos desconectado limpio a ${serverName}.`);
      } else {
        return res.status(500).send(`Error deteniendo proceso (borrado de base de datos): ${err.message}`);
      }
    }

    delete activeServers[serverName];
    savePids();
    res.send(`Servidor ${serverName} detenido (PID ${serverInfo.pid})`);
  });
};

export const restartServer = (req: Request, res: Response) => {
  const { serverName } = req.body;
  if (!serverName) return res.status(400).send('Se requiere serverName');

  const serverPath = path.join(SERVERS_PATH, serverName, 'acServer.exe');
  if (!fs.existsSync(serverPath)) return res.status(404).send('Servidor no existe');

  const stopAndStart = () => {
    // Arrancar de nuevo
    const acDir = path.dirname(serverPath);
    const server = spawn('cmd.exe', ['/c', `"${serverPath}"`], {
      cwd: acDir,
      shell: true,
      detached: true,
      stdio: 'inherit',
    });

    if (server.pid) {
      server.unref();
      activeServers[serverName] = { pid: server.pid };
      savePids();
      res.send(`Servidor ${serverName} reiniciado (New PID: ${server.pid})`);
    } else {
      res.status(500).send('Servidor reiniciado pero falló obtención de PID');
    }
  };

  const serverInfo = activeServers[serverName];
  if (serverInfo && serverInfo.pid) {
    exec(`taskkill /PID ${serverInfo.pid} /T /F`, (err) => {
      if (err) console.error("Error deteniendo anterior (quizás ya muert0):", err);
      delete activeServers[serverName];
      savePids();
      // Pequeño delay para asegurar liberación de recursos/puertos
      setTimeout(stopAndStart, 1000);
    });
  } else {
    // No estaba corriendo o no teníamos PID
    stopAndStart();
  }
};

export const serverStatus = (req: Request, res: Response) => {
  const { serverName } = req.body;
  if (!serverName) return res.status(400).send('Se requiere serverName');

  const serverInfo = activeServers[serverName];
  if (serverInfo && serverInfo.pid) {
    exec(`tasklist /FI "PID eq ${serverInfo.pid}"`, (err, stdout) => {
      if (stdout && stdout.includes(serverInfo.pid.toString())) {
        res.send(`Servidor ${serverName} está activo (PID ${serverInfo.pid})`);
      } else {
        // PID no encontrado, limpiar
        delete activeServers[serverName];
        savePids();
        res.send(`Servidor ${serverName} NO está activo (PID ${serverInfo.pid} no encontrado)`);
      }
    });
  } else {
    res.send(`Servidor ${serverName} NO está registrado como activo`);
  }
};



// ------------------------ CONFIGURACIÓN ------------------------
export const configureServer = (req: Request, res: Response) => {
  const { serverName, password, track, configTrack, maxClients, entries, displayName } = req.body;

  if (!serverName) {
    return res.status(400).send('serverName es requerido');
  }

  const cfgPath = path.join(
    SERVERS_PATH!,
    serverName,
    'cfg',
    'server_cfg.ini'
  );

  const entryListPath = path.join(
    SERVERS_PATH!,
    serverName,
    'cfg',
    'entry_list.ini'
  );

  if (!fs.existsSync(cfgPath)) {
    return res.status(404).send('server_cfg.ini no existe para este servidor');
  }

  try {
    let content = fs.readFileSync(cfgPath, 'utf-8');
    const modifications: string[] = [];

    // Actualizar Nombre Visual (NAME)
    if (displayName !== undefined) {
      if (/^NAME=.*/m.test(content)) {
        content = content.replace(/^NAME=.*/m, `NAME=${displayName}`);
      } else {
        content += `\nNAME=${displayName}`;
      }
      modifications.push('displayName (NAME)');
    }

    // Actualizar Password
    if (password !== undefined) {
      if (/^PASSWORD=.*/m.test(content)) {
        content = content.replace(/^PASSWORD=.*/m, `PASSWORD=${password}`);
      } else {
        content += `\nPASSWORD=${password}`;
      }
      modifications.push('password');
    }

    // Actualizar Track
    if (track !== undefined) {
      if (/^TRACK=.*/m.test(content)) {
        content = content.replace(/^TRACK=.*/m, `TRACK=${track}`);
      } else {
        content += `\nTRACK=${track}`;
      }
      modifications.push('track');
    }

    // Actualizar Config Track
    if (configTrack !== undefined) {
      const value = configTrack ?? ''; // si es undefined o null → ''

      if (/^CONFIG_TRACK=.*/m.test(content)) {
        content = content.replace(
          /^CONFIG_TRACK=.*/m,
          `CONFIG_TRACK=${value}`
        );
      } else {
        content += `\nCONFIG_TRACK=${value}`;
      }

      modifications.push('configTrack');
    }


    // Actualizar Max Clients
    if (maxClients !== undefined) {
      if (/^MAX_CLIENTS=.*/m.test(content)) {
        content = content.replace(/^MAX_CLIENTS=.*/m, `MAX_CLIENTS=${maxClients}`);
      } else {
        content += `\nMAX_CLIENTS=${maxClients}`;
      }
      modifications.push('maxClients');
    }

    // Procesar Entries (CARS y entry_list.ini)
    if (entries && Array.isArray(entries)) {
      // 1. Extraer modelos únicos para CARS en server_cfg.ini
      const models = entries.map((e: any) => e.model);
      const uniqueModels = [...new Set(models)].join(';');

      if (/^CARS=.*/m.test(content)) {
        content = content.replace(/^CARS=.*/m, `CARS=${uniqueModels}`);
      } else {
        content += `\nCARS=${uniqueModels}`;
      }
      modifications.push('cars (server_cfg.ini)');

      // 2. Generar entry_list.ini
      let entryListContent = '';
      let carIndex = 0;
      for (const entry of entries) {
        const count = entry.count || 1;
        for (let i = 0; i < count; i++) {
          entryListContent += `[CAR_${carIndex}]\n`;
          entryListContent += `MODEL=${entry.model}\n`;
          entryListContent += `SKIN=${entry.skin || '0_default'}\n`;
          entryListContent += `SPECTATOR_MODE=0\n`;
          entryListContent += `DRIVERNAME=\n`;
          entryListContent += `TEAM=\n`;
          entryListContent += `GUID=\n`;
          entryListContent += `BALLAST=0\n`;
          entryListContent += `RESTRICTOR=0\n\n`;
          carIndex++;
        }
      }
      fs.writeFileSync(entryListPath, entryListContent, 'utf-8');
      modifications.push('entry_list.ini (regenerated)');
    }

    if (modifications.length === 0) {
      return res.status(400).send('No se proporcionaron campos para actualizar');
    }

    fs.writeFileSync(cfgPath, content, 'utf-8');
    res.send(`Configuración actualizada en ${serverName}: ${modifications.join(', ')}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al actualizar la configuración del servidor');
  }
};

