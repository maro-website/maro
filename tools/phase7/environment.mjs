// Report variable names/presence and source references; never serialize values.
import fs from 'node:fs';
import path from 'node:path';
import {parseEnv} from 'node:util';
const local=parseEnv(fs.readFileSync('.env.local','utf8'));
const files=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory()){if(entry.name!=='__tests__')walk(p);}else if(/\.[jt]sx?$/.test(p))files.push(p);}}
walk('src');files.push('start.mjs','next.config.mjs','security-headers.mjs');
const refs={};for(const file of files){const source=fs.readFileSync(file,'utf8');for(const match of source.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g))(refs[match[1]]??=new Set()).add(file.replaceAll('\\','/'));}
const variables=[...new Set([...Object.keys(refs),...Object.keys(local)])].sort().map(name=>({name,present:Boolean(local[name]?.trim()||process.env[name]?.trim()),consumers:[...(refs[name]??[])]}));
fs.mkdirSync('scripts/phase7-data',{recursive:true});fs.writeFileSync('scripts/phase7-data/environment.json',JSON.stringify(variables,null,2));
console.log(JSON.stringify(variables));
