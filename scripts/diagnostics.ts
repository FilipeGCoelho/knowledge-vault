import fs from 'fs';

const snapshot = {
  ts: new Date().toISOString(),
  app: {
    name: 'kmv-refinement',
    version: require('../package.json').version
  },
  env: {
    node: process.version,
    platform: process.platform,
    arch: process.arch
  }
};

fs.writeFileSync('diagnostics.json', JSON.stringify(snapshot, null, 2));
console.log('Diagnostics written to diagnostics.json');
