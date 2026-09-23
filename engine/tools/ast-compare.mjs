/* 두 폴더의 같은 이름 .js 파일을 「구문 트리(AST)」로 비교한다.
   공백·줄바꿈·들여쓰기만 다르고 코드의 뜻이 같으면 트리가 똑같다.
   보기 좋게 정리(beautify)한 뒤에도 뜻이 안 변했는지 확인하는 용도.

   사용: node engine/tools/ast-compare.mjs <원본폴더> <비교폴더> [...]
*/
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const acorn = await import('acorn').catch(() => null);
if (!acorn) {
  console.error('acorn 이 없습니다:  npm i -D acorn  또는  npx --yes -p acorn node ...');
  process.exit(2);
}

const walk = dir => readdirSync(dir).flatMap(name => {
  const p = join(dir, name);
  return statSync(p).isDirectory() ? walk(p) : (name.endsWith('.js') ? [p] : []);
});

/** 위치 정보(start/end/loc/range)를 뺀 트리를 안정된 순서로 직렬화 */
const shape = node => {
  if (Array.isArray(node)) return node.map(shape);
  if (node && typeof node === 'object') {
    const out = {};
    for (const k of Object.keys(node).sort()) {
      if (k === 'start' || k === 'end' || k === 'loc' || k === 'range') continue;
      out[k] = shape(node[k]);
    }
    return out;
  }
  return node;
};

const astHash = file => {
  const src = readFileSync(file, 'utf8');
  const tree = acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script' });
  return createHash('sha256').update(JSON.stringify(shape(tree))).digest('hex');
};

const [base, ...others] = process.argv.slice(2);
if (!base || !others.length) {
  console.error('사용: node engine/tools/ast-compare.mjs <원본폴더> <비교폴더>');
  process.exit(2);
}

let bad = 0, n = 0;
for (const file of walk(base)) {
  const rel = relative(base, file);
  const a = astHash(file);
  for (const other of others) {
    const cand = join(other, rel);
    let b;
    try { b = astHash(cand); } catch (e) { console.log(`❌ ${rel}  ← ${other}: ${e.message}`); bad++; continue; }
    n++;
    if (a === b) console.log(`✅ ${rel.padEnd(16)} ${a.slice(0, 12)}`);
    else { console.log(`❌ ${rel.padEnd(16)} ${a.slice(0, 12)} ≠ ${b.slice(0, 12)}`); bad++; }
  }
}
console.log(`\n${n}개 비교, 다른 것 ${bad}개`);
process.exit(bad ? 1 : 0);
