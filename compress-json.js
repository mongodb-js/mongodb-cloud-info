const zlib = require('zlib');
const fs = require('fs').promises;
const util = require('util');
const gzip = util.promisify(zlib.gzip);

(async() => {
  const input = await fs.readFile(process.argv[2]);
  const compressed = (await gzip(input)).toString('base64');
  await fs.writeFile(process.argv[3], `module.exports = '${compressed}';\n`);
})().catch(err => process.nextTick(() => { throw err; }));
