import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  STATIC_PUBLIC_ROUTES,
  ROUTE_ALIASES,
  AUTH_MODAL_ROUTES,
  PRIVATE_EXACT_ROUTES,
  PRIVATE_ROUTE_PREFIXES,
  DYNAMIC_PUBLIC_PREFIXES,
  ALL_EXACT_ROUTES,
} from '../src/config/routes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appTsxPath = path.resolve(__dirname, '../src/App.tsx');
const appTsxContent = fs.readFileSync(appTsxPath, 'utf8');

// 1. Extract all switch case paths: case '/path':
const caseRegex = /case\s+['"]([^'"]+)['"]\s*:/g;
const switchRoutes: string[] = [];
let match: RegExpExecArray | null;

while ((match = caseRegex.exec(appTsxContent)) !== null) {
  const route = match[1];
  if (route.startsWith('/')) {
    switchRoutes.push(route);
  }
}

// 2. Extract currentPath === '/path' equality checks
const eqRegex = /currentPath\s*===\s*['"]([^'"]+)['"]/g;
const eqRoutes: string[] = [];
while ((match = eqRegex.exec(appTsxContent)) !== null) {
  const route = match[1];
  if (route.startsWith('/')) {
    eqRoutes.push(route);
  }
}

// 3. Extract currentPath.startsWith('/prefix/') checks
const startsWithRegex = /currentPath\.startsWith\(['"]([^'"]+)['"]\)/g;
const prefixRoutes: string[] = [];
while ((match = startsWithRegex.exec(appTsxContent)) !== null) {
  const prefix = match[1];
  if (prefix.startsWith('/')) {
    prefixRoutes.push(prefix);
  }
}

const allExactFound = Array.from(new Set([...switchRoutes, ...eqRoutes]));
const allPrefixesFound = Array.from(new Set(prefixRoutes));

console.log('Verifying route parity between src/App.tsx and src/config/routes.ts...');
console.log(`Discovered ${allExactFound.length} exact routes and ${allPrefixesFound.length} prefix checks in App.tsx.`);

const missingExact: string[] = [];
for (const route of allExactFound) {
  const isCovered = (ALL_EXACT_ROUTES as readonly string[]).includes(route);
  if (!isCovered) {
    missingExact.push(route);
  }
}

const allConfiguredPrefixes = [
  ...PRIVATE_ROUTE_PREFIXES,
  ...DYNAMIC_PUBLIC_PREFIXES,
  '/admin', // App.tsx checks startsWith('/admin')
];

const missingPrefixes: string[] = [];
for (const prefix of allPrefixesFound) {
  const isCovered = allConfiguredPrefixes.includes(prefix);
  if (!isCovered) {
    missingPrefixes.push(prefix);
  }
}

if (missingExact.length > 0 || missingPrefixes.length > 0) {
  console.error('Route parity check FAILED.');
  if (missingExact.length > 0) {
    console.error('Missing exact routes in src/config/routes.ts:', missingExact);
  }
  if (missingPrefixes.length > 0) {
    console.error('Missing prefix routes in src/config/routes.ts:', missingPrefixes);
  }
  process.exit(1);
}

console.log('Route parity verified: All routes handled in App.tsx exist in src/config/routes.ts.');
process.exit(0);
