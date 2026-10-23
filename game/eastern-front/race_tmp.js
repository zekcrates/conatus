const fs = require('fs');
let code = ['js/data.js','js/engine.js','js/ai.js'].map(f=>fs.readFileSync(f,'utf8')).join(String.fromCharCode(10));
code += String.fromCharCode(10) + [
  '(function(){',
  "  const g = new Game('NONE'); g.playerSide='NONE';",
  '  try{',
  "    while(g.phase==='play' && g.day < END_DAY+5){ g.tick(0.3); }",
  "  }catch(e){ console.error('ENGINE CRASH day', g.day.toFixed(1), e.message, '|', (e.stack||'').split(String.fromCharCode(10))[1]); process.exit(1); }",
  "  console.log('full war clean, ended', g.dateShort());",
  '})();'
].join(String.fromCharCode(10));
eval(code);
