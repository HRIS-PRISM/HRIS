const fs = require('fs');
const path = process.argv[2] || 'backend/payrollRoutes/Payroll.js';
const s = fs.readFileSync(path, 'utf8');
const stack = [];
const pairs = { '{': '}', '(': ')', '[': ']', '`': '`', '"':'"', "'":"'" };
const open = new Set(Object.keys(pairs));
const close = new Set(Object.values(pairs));
let line=1,col=0;
for (let i=0;i<s.length;i++){
  const ch=s[i];
  col++;
  if (ch==='\n'){line++;col=0}
  if (open.has(ch)){
    // handle quotes/backticks: if top is same quote, pop; else push
    if (ch==='`' || ch==="\"" || ch==="'"){
      if (stack.length>0 && stack[stack.length-1].ch===ch){stack.pop();}
      else stack.push({ch, line, col, idx:i});
    } else {
      stack.push({ch, line, col, idx:i});
    }
  } else if (close.has(ch)){
    // find matching open
    if (ch==='}'||ch===')'||ch===']'){
      if (stack.length===0){console.log('Unmatched closing',ch,'at',line,col); process.exit(0)}
      const top=stack[stack.length-1];
      const expected = pairs[top.ch];
      if (expected===ch){stack.pop();} else {console.log('Mismatched at',line,col,'expected',expected,'got',ch); process.exit(0)}
    } else if (ch==='`' || ch==="\"" || ch==="'"){
      if (stack.length>0 && stack[stack.length-1].ch===ch){stack.pop();} else {stack.push({ch,line,col,idx:i});}
    }
  }
}
if (stack.length===0) {console.log('All delimiters balanced.'); process.exit(0)}
console.log('Unclosed tokens at EOF:');
stack.forEach(sx=>console.log(sx.ch,'opened at',sx.line+':'+sx.col));
process.exit(0);
