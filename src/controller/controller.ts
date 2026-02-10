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
const activeServers: Record<string, boolean> = {};

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

    server.unref();
    activeServers[serverName] = true;

    res.send(`Servidor ${serverName} iniciado`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al iniciar AC Server');
  }
};

export const stopServer = (req: Request, res: Response) => {
  const { serverName } = req.body;
  if (!serverName) return res.status(400).send('Se requiere serverName');

  const serverPath = path.join(SERVERS_PATH, serverName, 'acServer.exe');
  if (!fs.existsSync(serverPath)) return res.status(404).send('Servidor no existe');

  exec('tasklist | findstr acServer.exe', (err, stdout) => {
    if (!stdout || !stdout.includes('acServer.exe')) {
      activeServers[serverName] = false;
      return res.send(`Servidor ${serverName} no estaba activo`);
    }

    exec('taskkill /IM acServer.exe /F', (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error al detener AC Server');
      }
      activeServers[serverName] = false;
      res.send(`Servidor ${serverName} detenido`);
    });
  });
};

export const restartServer = (req: Request, res: Response) => {
  const { serverName } = req.body;
  if (!serverName) return res.status(400).send('Se requiere serverName');

  const serverPath = path.join(SERVERS_PATH, serverName, 'acServer.exe');
  if (!fs.existsSync(serverPath)) return res.status(404).send('Servidor no existe');

  // Detener
  exec('taskkill /IM acServer.exe /F', (err) => {
    // Arrancar de nuevo
    const acDir = path.dirname(serverPath);
    const server = spawn('cmd.exe', ['/c', `"${serverPath}"`], {
      cwd: acDir,
      shell: true,
      detached: true,
      stdio: 'inherit',
    });
    server.unref();
    activeServers[serverName] = true;

    res.send(`Servidor ${serverName} reiniciado`);
  });
};

export const serverStatus = (req: Request, res: Response) => {
  const { serverName } = req.body;
  if (!serverName) return res.status(400).send('Se requiere serverName');

  exec('tasklist | findstr acServer.exe', (err, stdout) => {
    if (stdout && stdout.includes('acServer.exe')) {
      res.send(`Servidor ${serverName} está activo`);
    } else {
      res.send(`Servidor ${serverName} NO está activo`);
    }
  });
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
