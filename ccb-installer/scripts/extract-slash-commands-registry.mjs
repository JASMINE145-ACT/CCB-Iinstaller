#!/usr/bin/env bun
/**
 * Extract slash command name + description from // src/commands/ blocks only.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const chunkPath = join(scriptDir, "..", "dist", "chunk-xg5k46jr.js");
const content = readFileSync(chunkPath, "utf8");

const sections = content.split(/(?=\/\/ src\/commands\/)/g).slice(1);
const commands = [];

for (const section of sections) {
  const srcPath = section.match(/^\/\/ src\/commands\/([^\n]+)/)?.[1]?.trim();
  if (!srcPath) continue;

  const nameMatch = section.match(/\bname: "([^"]+)"/);
  if (!nameMatch) continue;
  const name = nameMatch[1];
  if (name === "stub") continue;

  let description = null;
  let descriptionKind = "static";

  const staticDesc = section.match(/\bdescription: "((?:\\.|[^"\\])*)"/);
  const templateDesc = section.match(/\bdescription: `((?:\\.|[^`\\])*)`/);
  const ternaryDesc = section.match(/\bdescription: [^?\n]+\? "((?:\\.|[^"\\])*)" : "((?:\\.|[^"\\])*)"/);
  const getterDesc = section.match(/get description\(\) \{\s*return `((?:\\.|[^`\\])*)`;/);

  if (getterDesc) {
    description = getterDesc[1];
    descriptionKind = "getter-template";
  } else if (ternaryDesc) {
    description = `${ternaryDesc[1]} | ${ternaryDesc[2]}`;
    descriptionKind = "ternary";
  } else if (templateDesc) {
    description = templateDesc[1];
    descriptionKind = "template";
  } else if (staticDesc) {
    description = staticDesc[1];
    descriptionKind = "static";
  } else {
    continue;
  }

  commands.push({ srcPath, name, description, descriptionKind });
}

commands.sort((a, b) => a.name.localeCompare(b.name));
const out = join(scriptDir, "slash-commands-registry.json");
writeFileSync(out, JSON.stringify(commands, null, 2), "utf8");
console.log(`Registry commands: ${commands.length} -> ${out}`);
