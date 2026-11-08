'use strict';
// Downloads the official Xray-core release and unpacks it next to this file.
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DIR = __dirname;
const ZIP = path.join(DIR, 'xray.zip');
const BIN = path.join(DIR, 'xray');
const DOWNLOAD_URL = 'https://github.com/XTLS/Xray-core/releases/latest/download/Xray-linux-64.zip';

function download(url, dest, redirectsLeft) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'pxxl-setup' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (redirectsLeft <= 0) return reject(new Error('too many redirects'));
        return resolve(download(res.headers.location, dest, redirectsLeft - 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error('download failed: HTTP ' + res.statusCode));
      }
      const out = fs.createWriteStream(dest);
      res.pipe(out);
      out.on('finish', () => out.close(resolve));
      out.on('error', reject);
    }).on('error', reject);
  });
}

(async () => {
  if (!fs.existsSync(BIN)) {
    await download(DOWNLOAD_URL, ZIP, 5);
    execFileSync('unzip', ['-o', '-q', ZIP], { cwd: DIR, stdio: 'inherit' });
    fs.chmodSync(BIN, 0o755);
    fs.unlinkSync(ZIP);
    for (const extra of ['LICENSE', 'README.md']) {
      const p = path.join(DIR, extra);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  }
  for (const f of ['geoip.dat', 'geosite.dat']) {
    if (!fs.existsSync(path.join(DIR, f))) throw new Error('missing asset: ' + f);
  }
  console.log('setup complete');
})().catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
