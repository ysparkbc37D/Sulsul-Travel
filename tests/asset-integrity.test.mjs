import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{buildPublic}=require('../tools/build-public.cjs'),{updateIntegrity}=require('../tools/update-asset-integrity.cjs');
const root=fileURLToPath(new URL('..',import.meta.url));
const outputFor=name=>path.join(root,'.local-review',`${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
const hash=file=>'sha384-'+createHash('sha384').update(readFileSync(file)).digest('base64');

test('공개 빌드는 실제 배포하는 모든 로컬 JS·CSS 바이트와 HTML 무결성 해시가 일치한다',()=>{
 const output=outputFor('integrity-public');buildPublic(output);
 const html=readFileSync(path.join(output,'index.html'),'utf8');let assets=0;
 for(const tag of html.match(/<(?:script|link)\b[^>]*>/g)||[]){
  const source=tag.match(/\b(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/);
  if(!source||/^(?:https?:|\/\/|data:)/.test(source[1])||! /\.(?:js|css)$/.test(source[1]))continue;
  const integrity=tag.match(/\bintegrity="([^"]+)"/);assert.ok(integrity,source[1]);
  assert.equal(integrity[1],hash(path.join(output,source[1])),source[1]);assets++;
 }
 assert.ok(assets>=20);assert.equal(updateIntegrity({rootDir:output,check:true}),assets);
});

test('Git 개행이 변환되어도 배포 디렉터리 바이트로 해시를 다시 만들고 변경된 해시를 감지한다',()=>{
 const output=outputFor('integrity-newline');mkdirSync(output,{recursive:true});
 writeFileSync(path.join(output,'index.html'),'<link href="asset.css" rel="stylesheet"><script src="asset.js"></script>');
 writeFileSync(path.join(output,'asset.css'),'body { color: black; }\r\n');writeFileSync(path.join(output,'asset.js'),'window.synthetic = true;\r\n');
 assert.equal(updateIntegrity({rootDir:output}),2);
 const before=readFileSync(path.join(output,'index.html'),'utf8');assert.ok(before.includes(hash(path.join(output,'asset.css'))));
 writeFileSync(path.join(output,'asset.css'),'body { color: black; }\n');
 assert.throws(()=>updateIntegrity({rootDir:output,check:true}),/ASSET_INTEGRITY_OUTDATED/);
 assert.equal(updateIntegrity({rootDir:output}),2);const after=readFileSync(path.join(output,'index.html'),'utf8');
 assert.notEqual(after,before);assert.ok(after.includes(hash(path.join(output,'asset.css'))));assert.equal(updateIntegrity({rootDir:output,check:true}),2);
});
