'use strict';
// Starts Xray with a VLESS + WebSocket inbound built from environment variables.
// Required env: UUID. Optional: WSPATH (default /ws), PORT (platform-provided, default 8080).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const uuid = process.env.UUID;
const wsPath = process.env.WSPATH || '/ws';
const port = Number.parseInt(process.env.PORT || '8080', 10);

if (!uuid) {
  console.error('UUID environment variable is required');
  process.exit(1);
}
if (!wsPath.startsWith('/')) {
  console.error('WSPATH must start with /');
  process.exit(1);
}

const bin = path.join(__dirname, 'xray');
if (!fs.existsSync(bin)) {
  execFileSync(process.execPath, [path.join(__dirname, 'setup.js')], { stdio: 'inherit' });
}

const config = {
  log: { loglevel: 'warning' },
  inbounds: [
    {
      listen: '0.0.0.0',
      port: port,
      protocol: 'vless',
      settings: {
        clients: [{ id: uuid, flow: '' }],
        decryption: 'none'
      },
      streamSettings: {
        network: 'ws',
        wsSettings: { path: wsPath }
      },
      sniffing: { enabled: true, destOverride: ['http', 'tls'] }
    }
  ],
  outbounds: [{ protocol: 'freedom', tag: 'direct' }]
};

const cfgPath = path.join(os.tmpdir(), 'xray-config-' + process.pid + '.json');
fs.writeFileSync(cfgPath, JSON.stringify(config));

const child = spawn(bin, ['run', '-c', cfgPath], { stdio: 'inherit', cwd: __dirname });
child.on('exit', (code) => process.exit(code === null ? 1 : code));
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => child.kill(sig));
}
