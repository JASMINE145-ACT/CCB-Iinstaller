// @bun
import {
  extractDescriptionFromMarkdown,
  getProjectDirsUpToHome,
  init_frontmatterParser,
  init_markdownConfigLoader,
  parseFrontmatter
} from "./chunk-xg5k46jr.js";
import"./chunk-b0ex2qgg.js";
import"./chunk-7qc1t27a.js";
import"./chunk-qe3qr56q.js";
import"./chunk-nd9hcjys.js";
import"./chunk-et824jj8.js";
import"./chunk-e86bxpak.js";
import"./chunk-var1et7e.js";
import"./chunk-evs14mjg.js";
import"./chunk-2gzv8nrw.js";
import"./chunk-ehtwnxpg.js";
import"./chunk-0rgqsb9t.js";
import"./chunk-c0kjpr24.js";
import"./chunk-cgfdkzhb.js";
import"./chunk-2f6hs25r.js";
import"./chunk-xnt2j152.js";
import"./chunk-sv7afh51.js";
import"./chunk-j7b884wk.js";
import"./chunk-w7xjra5m.js";
import"./chunk-zttmdag3.js";
import"./chunk-smxezvfx.js";
import"./chunk-7ac6mws7.js";
import"./chunk-ps49ymvj.js";
import"./chunk-chzfw06n.js";
import"./chunk-s2x040y6.js";
import"./chunk-t4kcvmes.js";
import"./chunk-kten1z0y.js";
import"./chunk-rdh5rbpt.js";
import"./chunk-cy1z66c2.js";
import"./chunk-51pnrq77.js";
import"./chunk-wxa2hdfg.js";
import"./chunk-4jm600zv.js";
import"./chunk-kyaxezdn.js";
import"./chunk-f57cvf1d.js";
import"./chunk-rkmwx1yz.js";
import"./chunk-cg02f0wy.js";
import"./chunk-ykr5qx9v.js";
import"./chunk-dhpmxxmx.js";
import"./chunk-yg1k879b.js";
import"./chunk-435qaxw3.js";
import"./chunk-c9pb40ft.js";
import"./chunk-ad6rg8vz.js";
import"./chunk-x95fhbwq.js";
import"./chunk-mk2vzd2n.js";
import"./chunk-mkae8zj9.js";
import"./chunk-cxmyg49v.js";
import"./chunk-zwarn9h7.js";
import"./chunk-t16fercx.js";
import"./chunk-7hmy36fh.js";
import"./chunk-6kpbgc5w.js";
import"./chunk-d57t992t.js";
import"./chunk-64c1avct.js";
import"./chunk-0knhp7v5.js";
import"./chunk-8g5pe1gr.js";
import"./chunk-b62vj92a.js";
import"./chunk-4cp6193g.js";
import"./chunk-8g747a8x.js";
import"./chunk-d7886r6a.js";
import"./chunk-90wp6wez.js";
import"./chunk-a8ejc632.js";
import"./chunk-f5ma3nh5.js";
import"./chunk-qz2x630m.js";
import"./chunk-c7t69jmn.js";
import"./chunk-6y2wszkc.js";
import"./chunk-3c25bcsw.js";
import"./chunk-9qh5f9r3.js";
import"./chunk-xhesahm0.js";
import"./chunk-rh5a2rg9.js";
import"./chunk-p2816w9z.js";
import"./chunk-v9smspw2.js";
import"./chunk-v1kzp02e.js";
import"./chunk-padf4crh.js";
import"./chunk-crmjpsqe.js";
import"./chunk-z9bw4q7j.js";
import"./chunk-evwb3c85.js";
import"./chunk-h0rbjg6x.js";
import"./chunk-0vkfrmqm.js";
import"./chunk-0xjaqda8.js";
import"./chunk-78009jh9.js";
import"./chunk-9awawyvh.js";
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
import {
  getClaudeConfigHomeDir,
  init_envUtils
} from "./chunk-hxhwzgnn.js";
import"./chunk-qx8z601m.js";
import"./chunk-cgm6758j.js";
import"./chunk-9m27g5s1.js";
import"./chunk-8pn8tvgg.js";
import"./chunk-netzwgv1.js";
import {
  __esm
} from "./chunk-qp2qdcda.js";

// src/jobs/templates.ts
import { readdirSync, readFileSync } from "fs";
import { join, basename } from "path";
function getTemplatesDirs() {
  const projectDirs = getProjectDirsUpToHome("templates", process.cwd());
  const userDir = join(getClaudeConfigHomeDir(), "templates");
  try {
    readdirSync(userDir);
    return [...projectDirs, userDir];
  } catch {
    return projectDirs;
  }
}
function listTemplates() {
  const templates = [];
  const seenNames = new Set;
  for (const dir of getTemplatesDirs()) {
    let files;
    try {
      files = readdirSync(dir);
    } catch {
      continue;
    }
    for (const file of files) {
      if (!file.endsWith(".md"))
        continue;
      const name = basename(file, ".md");
      if (seenNames.has(name))
        continue;
      seenNames.add(name);
      const filePath = join(dir, file);
      try {
        const raw = readFileSync(filePath, "utf-8");
        const { frontmatter, content } = parseFrontmatter(raw, filePath);
        const description = (typeof frontmatter.description === "string" ? frontmatter.description : "") || extractDescriptionFromMarkdown(content, "No description");
        templates.push({ name, description, filePath, frontmatter, content });
      } catch {}
    }
  }
  return templates;
}
function loadTemplate(name) {
  const all = listTemplates();
  return all.find((t) => t.name === name) ?? null;
}
var init_templates = __esm(() => {
  init_frontmatterParser();
  init_envUtils();
  init_markdownConfigLoader();
});

// src/jobs/state.ts
import { appendFileSync, mkdirSync, readFileSync as readFileSync2, writeFileSync } from "fs";
import { join as join2 } from "path";
function getJobsDir() {
  return join2(getClaudeConfigHomeDir(), "jobs");
}
function getJobDir(jobId) {
  return join2(getJobsDir(), jobId);
}
function createJob(jobId, templateName, templateContent, inputText, args) {
  const dir = getJobDir(jobId);
  mkdirSync(dir, { recursive: true });
  const now = new Date().toISOString();
  const state = {
    jobId,
    templateName,
    createdAt: now,
    updatedAt: now,
    status: "created",
    args
  };
  writeFileSync(join2(dir, "state.json"), JSON.stringify(state, null, 2), "utf-8");
  writeFileSync(join2(dir, "template.md"), templateContent, "utf-8");
  writeFileSync(join2(dir, "input.txt"), inputText, "utf-8");
  return dir;
}
function readJobState(jobId) {
  try {
    const raw = readFileSync2(join2(getJobDir(jobId), "state.json"), "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null)
      return null;
    const obj = parsed;
    if (typeof obj.jobId !== "string" || typeof obj.status !== "string") {
      return null;
    }
    return obj;
  } catch {
    return null;
  }
}
function appendJobReply(jobId, text) {
  const dir = getJobDir(jobId);
  const state = readJobState(jobId);
  if (!state)
    return false;
  const repliesPath = join2(dir, "replies.jsonl");
  const entry = JSON.stringify({
    text,
    timestamp: new Date().toISOString()
  });
  try {
    appendFileSync(repliesPath, entry + `
`, "utf-8");
  } catch {
    writeFileSync(repliesPath, entry + `
`, "utf-8");
  }
  const updated = { ...state, updatedAt: new Date().toISOString() };
  writeFileSync(join2(dir, "state.json"), JSON.stringify(updated, null, 2), "utf-8");
  return true;
}
var init_state = __esm(() => {
  init_envUtils();
});

// src/cli/handlers/templateJobs.ts
import { randomUUID } from "crypto";
async function templatesMain(args) {
  const subcommand = args[0];
  switch (subcommand) {
    case "list":
      handleList();
      break;
    case "new":
      handleNew(args.slice(1));
      break;
    case "reply":
      handleReply(args.slice(1));
      break;
    case "status":
      handleStatus(args.slice(1));
      break;
    default:
      console.error(`Unknown template command: ${subcommand}`);
      printUsage();
      process.exitCode = 1;
  }
}
function printUsage() {
  console.log(`
Template Job Commands:

  claude job list                    List available templates
  claude job new <template> [args]   Create a new job from a template
  claude job reply <job-id> <text>   Reply to an existing job
  claude job status <job-id>         Show job status
`);
}
function handleStatus(args) {
  const jobId = args[0];
  if (!jobId) {
    console.error("Usage: claude job status <job-id>");
    process.exitCode = 1;
    return;
  }
  const state = readJobState(jobId);
  if (!state) {
    console.error(`Job not found: ${jobId}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Job: ${state.jobId}`);
  console.log(`  Template: ${state.templateName}`);
  console.log(`  Status: ${state.status}`);
  console.log(`  Created: ${state.createdAt}`);
  console.log(`  Updated: ${state.updatedAt}`);
  console.log(`  Args: ${state.args.join(" ") || "(none)"}`);
}
function handleList() {
  const templates = listTemplates();
  if (templates.length === 0) {
    console.log("No templates found.");
    console.log("Place .md files in .claude/templates/ or ~/.claude/templates/");
    return;
  }
  console.log(`${templates.length} template${templates.length > 1 ? "s" : ""} found:
`);
  for (const t of templates) {
    console.log(`  ${t.name}`);
    console.log(`    ${t.description}`);
    console.log(`    Path: ${t.filePath}`);
    console.log();
  }
}
function handleNew(args) {
  const templateName = args[0];
  if (!templateName) {
    console.error("Usage: claude job new <template> [args...]");
    process.exitCode = 1;
    return;
  }
  const template = loadTemplate(templateName);
  if (!template) {
    console.error(`Template not found: ${templateName}`);
    console.log(`
Available templates:`);
    for (const t of listTemplates()) {
      console.log(`  ${t.name}`);
    }
    process.exitCode = 1;
    return;
  }
  const jobId = randomUUID().slice(0, 8);
  const inputText = args.slice(1).join(" ");
  const rawContent = `---
${Object.entries(template.frontmatter).map(([k, v]) => `${k}: ${v}`).join(`
`)}
---
${template.content}`;
  const dir = createJob(jobId, templateName, rawContent, inputText, args.slice(1));
  console.log(`Job created: ${jobId}`);
  console.log(`  Template: ${templateName}`);
  console.log(`  Directory: ${dir}`);
  if (inputText) {
    console.log(`  Input: ${inputText}`);
  }
}
function handleReply(args) {
  const jobId = args[0];
  const text = args.slice(1).join(" ");
  if (!jobId || !text) {
    console.error("Usage: claude job reply <job-id> <text>");
    process.exitCode = 1;
    return;
  }
  const state = readJobState(jobId);
  if (!state) {
    console.error(`Job not found: ${jobId}`);
    process.exitCode = 1;
    return;
  }
  const ok = appendJobReply(jobId, text);
  if (ok) {
    console.log(`Reply added to job ${jobId}`);
    console.log(`  Directory: ${getJobDir(jobId)}`);
  } else {
    console.error(`Failed to append reply to job ${jobId}`);
    process.exitCode = 1;
  }
}
var init_templateJobs = __esm(() => {
  init_templates();
  init_state();
});
init_templateJobs();

export {
  templatesMain
};
