const fs = require('fs');
const path = require('path');
const htmlPath = path.join(__dirname, 'public', 'ial_study_hub.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
if (!match) {
  console.error('No script block found');
  process.exit(1);
}
const src = match[1];
const outPath = path.join(__dirname, 'script_to_parse.js');
fs.writeFileSync(outPath, src, 'utf8');
try {
  new Function(src);
  console.log('parse ok');
} catch (e) {
  console.error('ERR', e.message);
  console.error('line', e.lineNumber);
  console.error('col', e.columnNumber);
  const lines = src.split(/\n/);
  const start = Math.max(0, e.lineNumber - 5);
  const end = Math.min(lines.length, e.lineNumber + 5);
  console.error(lines.slice(start, end).join('\n'));
  process.exit(1);
}
