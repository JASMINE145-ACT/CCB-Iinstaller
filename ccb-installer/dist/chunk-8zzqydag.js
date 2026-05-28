// @bun
import {
  findGitRoot,
  init_git
} from "./chunk-9awawyvh.js";
import"./chunk-hqpzpr71.js";
import"./chunk-zs5b1dgr.js";
import"./chunk-hnxmafvc.js";
import"./chunk-tv74hgw9.js";
import"./chunk-wd8mqz95.js";
import"./chunk-8tnsngw2.js";
import"./chunk-vsbyhpfy.js";
import"./chunk-p7pj6wf8.js";
import"./chunk-5z28bqne.js";
import"./chunk-qajrkk97.js";
import"./chunk-5khwvj1z.js";
import"./chunk-fbv4apne.js";
import"./chunk-gzp6rza1.js";
import"./chunk-50dgek10.js";
import"./chunk-7wm5s02e.js";
import"./chunk-z0csm2zq.js";
import"./chunk-hxhwzgnn.js";
import"./chunk-qx8z601m.js";
import"./chunk-cgm6758j.js";
import"./chunk-qp2qdcda.js";

// src/cli/up.ts
init_git();
import { readFileSync } from "fs";
import { join } from "path";
import { spawnSync } from "child_process";
async function up() {
  const cwd = process.cwd();
  const gitRoot = findGitRoot(cwd);
  const searchDirs = gitRoot ? [gitRoot, cwd] : [cwd];
  let upSection = null;
  for (const dir of searchDirs) {
    const claudeMdPath = join(dir, "CLAUDE.md");
    try {
      const content = readFileSync(claudeMdPath, "utf-8");
      upSection = extractUpSection(content);
      if (upSection) {
        console.log(`Found "# claude up" in ${claudeMdPath}`);
        break;
      }
    } catch {}
  }
  if (!upSection) {
    console.log(`No "# claude up" section found in CLAUDE.md.
` + `Add a section like:

` + `  # claude up
` + "  ```bash\n" + `  npm install
` + `  npm run build
` + "  ```");
    return;
  }
  console.log(`Running:
`);
  console.log(upSection);
  console.log();
  const result = spawnSync("bash", ["-c", upSection], {
    cwd,
    stdio: "inherit"
  });
  if (result.status !== 0) {
    console.error(`
claude up failed with exit code ${result.status}`);
    process.exitCode = result.status ?? 1;
  } else {
    console.log(`
claude up completed successfully.`);
  }
}
function extractUpSection(markdown) {
  const lines = markdown.split(`
`);
  let inSection = false;
  const sectionLines = [];
  for (const line of lines) {
    if (/^#\s+claude\s+up\b/i.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection && /^#\s/.test(line)) {
      break;
    }
    if (inSection) {
      sectionLines.push(line);
    }
  }
  if (sectionLines.length === 0)
    return null;
  let text = sectionLines.join(`
`).trim();
  text = text.replace(/^```\w*\n?/, "").replace(/\n?```\s*$/, "");
  return text.trim() || null;
}
export {
  up
};
