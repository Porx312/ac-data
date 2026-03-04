import { Request, Response } from 'express';
import { spawn, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const SERVERS_PATH = process.env.SERVERS_PATH;
if (!SERVERS_PATH) throw new Error('SERVERS_PATH no definido en .env');

// Registro en memoria de servidores activos
const activeServers: Record<string, { pid: number } | undefined> = {};

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
    // Fallback? O simplemente decir que no está activo bajo nuestro control
    // Riesgo: si reiniciaron el backend, perdemos los PIDs.
    // Pero 'taskkill /IM' es destructivo. Mejor fallar seguro o limpiar manual.
    // Podríamos intentar buscar por ruta si pudiéramos, pero tasklist no da path fácilmente en windows nativo sin wmic.
    delete activeServers[serverName];
    return res.status(404).send(`Servidor ${serverName} no parece estar activo (PID perdido).`);
  }

  // Usar /T para matar el árbol de procesos (cmd.exe -> acServer.exe)
  exec(`taskkill /PID ${serverInfo.pid} /T /F`, (err, stdout) => {
    if (err) {
      console.error(err);
      // Si falla, quizás ya no existe
      delete activeServers[serverName];
      return res.status(500).send(`Error o proceso ya terminado: ${err.message}`);
    }

    delete activeServers[serverName];
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
      res.send(`Servidor ${serverName} reiniciado (New PID: ${server.pid})`);
    } else {
      res.status(500).send('Servidor reiniciado pero falló obtención de PID');
    }
  };

  const serverInfo = activeServers[serverName];
  if (serverInfo && serverInfo.pid) {
    exec(`taskkill /PID ${serverInfo.pid} /T /F`, (err) => {
      if (err) console.error("Error deteniendo anterior:", err);
      delete activeServers[serverName];
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
        res.send(`Servidor ${serverName} NO está activo (PID ${serverInfo.pid} no encontrado)`);
      }
    });
  } else {
    res.send(`Servidor ${serverName} NO está registrado como activo`);
  }
};

// ------------------------ CONFIGURACIÓN ------------------------

const cfgFile = path.join(SERVERS_PATH || '', 'server_cfg.ini'); // puedes ajustar para cada server si quieres

export const setPassword = (req: Request, res: Response) => {
  const { serverName, password } = req.body;

  if (!serverName || !password) {
    return res.status(400).send('serverName y password son requeridos');
  }

  const cfgPath = path.join(
    SERVERS_PATH!,
    serverName,
    'cfg',
    'server_cfg.ini'
  );

  if (!fs.existsSync(cfgPath)) {
    return res.status(404).send('server_cfg.ini no existe para este servidor');
  }

  try {
    let content = fs.readFileSync(cfgPath, 'utf-8');

    if (/^PASSWORD=.*/m.test(content)) {
      content = content.replace(/^PASSWORD=.*/m, `PASSWORD=${password}`);
    } else {
      content += `\nPASSWORD=${password}`;
    }

    fs.writeFileSync(cfgPath, content, 'utf-8');
    res.send(`Contraseña actualizada en ${serverName}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al actualizar la contraseña');
  }
};


export const setTrack = (req: Request, res: Response) => {
  const { serverName, track, configTrack } = req.body;

  if (!serverName || !track || !configTrack) {
    return res.status(400).send('serverName, track y configTrack son requeridos');
  }

  const cfgPath = path.join(
    SERVERS_PATH!,
    serverName,
    'cfg',
    'server_cfg.ini'
  );

  if (!fs.existsSync(cfgPath)) {
    return res.status(404).send('server_cfg.ini no existe para este servidor');
  }

  try {
    let content = fs.readFileSync(cfgPath, 'utf-8');

    if (/^TRACK=.*/m.test(content)) {
      content = content.replace(/^TRACK=.*/m, `TRACK=${track}`);
    } else {
      content += `\nTRACK=${track}`;
    }

    if (/^CONFIG_TRACK=.*/m.test(content)) {
      content = content.replace(
        /^CONFIG_TRACK=.*/m,
        `CONFIG_TRACK=${configTrack}`
      );
    } else {
      content += `\nCONFIG_TRACK=${configTrack}`;
    }

    fs.writeFileSync(cfgPath, content, 'utf-8');
    res.send(`Track actualizado en ${serverName}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al actualizar el track');
  }
};
