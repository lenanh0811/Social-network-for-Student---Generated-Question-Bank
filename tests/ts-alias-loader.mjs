/**
 * Bộ nạp (loader) cho Node: cho phép test chạy trực tiếp code TypeScript của app.
 *  - "@/x"            → src/x
 *  - "./adapters"     → ./adapters.ts   (import không đuôi trong thư mục src)
 * Dùng: register('./ts-alias-loader.mjs', import.meta.url) rồi import() code trong src/.
 * Cần Node chạy với --experimental-transform-types (vì có cú pháp `public status` trong constructor).
 */
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isFile = (f) => existsSync(f) && statSync(f).isFile();

function find(base) {
  if (/\.(ts|tsx|mjs|js)$/.test(base) && isFile(base)) return base;
  for (const e of ['.ts', '.tsx', '/index.ts', '/index.tsx']) if (isFile(base + e)) return base + e;
  return undefined;
}

export async function resolve(specifier, context, next) {
  let base;
  if (specifier.startsWith('@/')) base = path.join(root, 'src', specifier.slice(2));
  else if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.includes('/src/')) {
    base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }
  const file = base && find(base);
  if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
  return next(specifier, context);
}
