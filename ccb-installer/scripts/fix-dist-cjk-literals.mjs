/**
 * fix-dist-cjk-literals.mjs — Convert raw CJK in dist chunk backtick strings
 * to \uXXXX escapes. Handles nested template literals correctly via a state
 * machine (the previous regex-only version broke on `${n?`...`:\uXXXX...}`
 * patterns).
 *
 * After running, every Chinese character inside any backtick-enclosed template
 * literal (including those inside ${...} interpolations) will be encoded as
 * \uXXXX, preventing Bun on Windows from mojibake-ing the chunks.
 */
import fs from 'fs';
import path from 'path';

const chunksDir = process.argv[2] || 'D:/Projects/claude-code-best/ccb-installer/dist/chunks';

// Files with known upstream CJK that should be skipped entirely.
// These are NOT from the i18n patch — they exist in upstream source.
const skipPrefixes = [
  'loadAgentsDir-',
  'useVoice-',
  'intl-',
  'schemas-',
  'sessionObserver-',
  'skillGapStore-',
  'skillPanel-',
  'skillSearchPanel-',
];

// Cover CJK Unified Ideographs (U+4E00-9FFF), CJK Symbols & Punctuation
// (U+3000-303F), Hiragana/Katakana (U+3040-30FF), CJK Ext A (U+3400-4DBF),
// and Fullwidth Forms (U+FF00-FFEF). All of these mojibake under Bun on
// Windows if left as raw UTF-8 in minified JS chunks.
const CJK = /[\u3000-\u9fff\uff00-\uffef]/;
const CJK_G = /[\u3000-\u9fff\uff00-\uffef]/g;

function escapeChar(ch) {
  return '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0');
}

export { escapeChar, escapeCjkInTemplateLiterals, shouldSkip, skipPrefixes };

function shouldSkip(fname) {
  return skipPrefixes.some(p => fname.startsWith(p));
}

/**
 * Walk through the file and escape CJK inside any backtick template literal,
 * including those nested inside ${...} interpolations.
 */
function escapeCjkInTemplateLiterals(content) {
  let out = '';
  let i = 0;
  const n = content.length;
  // Stack of template literal frames. Each frame tracks how deep we are inside
  // ${...} interpolations within the current literal. A backtick only ends
  // a template literal when interpDepth is 0.
  const stack = [];

  while (i < n) {
    const top = stack[stack.length - 1];
    const c = content[i];

    if (top === undefined) {
      // Outside any template literal — skip regular JS tokens
      if (c === '`') {
        stack.push({ interpDepth: 0 });
        out += c;
        i++;
      } else if (c === '/' && content[i + 1] === '/') {
        // Line comment
        while (i < n && content[i] !== '\n') {
          out += content[i];
          i++;
        }
      } else if (c === '/' && content[i + 1] === '*') {
        // Block comment
        out += '/*';
        i += 2;
        while (i < n && !(content[i] === '*' && content[i + 1] === '/')) {
          out += content[i];
          i++;
        }
        if (i < n) { out += '*/'; i += 2; }
      } else if (c === '"' || c === "'") {
        // Regular string literal — preserve as-is (not subject to CJK escaping)
        out += c;
        i++;
        while (i < n && content[i] !== c) {
          if (content[i] === '\\') { out += content[i] + content[i + 1]; i += 2; }
          else { out += content[i]; i++; }
        }
        if (i < n) { out += c; i++; }
      } else {
        out += c;
        i++;
      }
      continue;
    }

    // Inside a template literal (or inside an interpolation within one)
    if (c === '\\') {
      // Escape sequence — preserve as-is
      out += c + (content[i + 1] ?? '');
      i += 2;
    } else if (c === '`') {
      if (top.interpDepth === 0) {
        // End of current template literal
        stack.pop();
        out += c;
        i++;
      } else {
        // Nested template literal inside an interpolation
        stack.push({ interpDepth: 0 });
        out += c;
        i++;
      }
    } else if (c === '$' && content[i + 1] === '{') {
      top.interpDepth++;
      out += '${';
      i += 2;
    } else if (top.interpDepth > 0 && c === '}') {
      top.interpDepth--;
      out += c;
      i++;
    } else if (CJK.test(c)) {
      out += escapeChar(c);
      i++;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

let fixed = 0;
let totalChars = 0;
const files = fs.readdirSync(chunksDir).filter(f => f.endsWith('.js'));

// Only run the main loop when this script is invoked directly (CLI),
// not when imported as a module (e.g., from test scripts).
import { fileURLToPath } from 'url';
const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isCli) {
  for (const f of files) {
    if (shouldSkip(f)) continue;
    const p = path.join(chunksDir, f);
    const orig = fs.readFileSync(p, 'utf8');
    if (!CJK_G.test(orig)) continue;
    const out = escapeCjkInTemplateLiterals(orig);
    if (out !== orig) {
      fs.writeFileSync(p, out, 'utf8');
      const n = (orig.match(CJK_G) || []).length;
      totalChars += n;
      console.log(`fixed ${f} (${n} CJK chars processed)`);
      fixed++;
    }
  }
  console.log(`Done. ${fixed} files updated, ${totalChars} CJK chars total.`);
}
