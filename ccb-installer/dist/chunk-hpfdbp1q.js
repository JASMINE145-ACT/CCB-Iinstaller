// @bun
import {
  Select,
  extractTextContent,
  g,
  init_marked_esm,
  init_messages1 as init_messages,
  init_select,
  stripPromptXMLTags
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
import {
  countCharInString,
  getGlobalConfig,
  init_config1 as init_config,
  init_stringUtils,
  saveGlobalConfig
} from "./chunk-mk2vzd2n.js";
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
import {
  Byline,
  KeyboardShortcutHint,
  Pane,
  ThemedBox_default,
  ThemedText,
  init_src,
  setClipboard,
  stringWidth
} from "./chunk-z9bw4q7j.js";
import {
  require_jsx_dev_runtime,
  require_react
} from "./chunk-evwb3c85.js";
import {
  init_analytics,
  logEvent
} from "./chunk-h0rbjg6x.js";
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
import"./chunk-hxhwzgnn.js";
import"./chunk-qx8z601m.js";
import"./chunk-cgm6758j.js";
import"./chunk-9m27g5s1.js";
import"./chunk-8pn8tvgg.js";
import"./chunk-netzwgv1.js";
import {
  __esm,
  __toESM
} from "./chunk-qp2qdcda.js";

// src/commands/copy/copy.tsx
import { mkdir, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
function extractCodeBlocks(markdown) {
  const tokens = g.lexer(stripPromptXMLTags(markdown));
  const blocks = [];
  for (const token of tokens) {
    if (token.type === "code") {
      const codeToken = token;
      blocks.push({ code: codeToken.text, lang: codeToken.lang });
    }
  }
  return blocks;
}
function collectRecentAssistantTexts(messages) {
  const texts = [];
  for (let i = messages.length - 1;i >= 0 && texts.length < MAX_LOOKBACK; i--) {
    const msg = messages[i];
    if (msg?.type !== "assistant" || msg.isApiErrorMessage)
      continue;
    const content = msg.message.content;
    if (!Array.isArray(content))
      continue;
    const text = extractTextContent(content, `

`);
    if (text)
      texts.push(text);
  }
  return texts;
}
function fileExtension(lang) {
  if (lang) {
    const sanitized = lang.replace(/[^a-zA-Z0-9]/g, "");
    if (sanitized && sanitized !== "plaintext") {
      return `.${sanitized}`;
    }
  }
  return ".txt";
}
async function writeToFile(text, filename) {
  const filePath = join(COPY_DIR, filename);
  await mkdir(COPY_DIR, { recursive: true });
  await writeFile(filePath, text, "utf-8");
  return filePath;
}
async function copyOrWriteToFile(text, filename) {
  const raw = await setClipboard(text);
  if (raw)
    process.stdout.write(raw);
  const lineCount = countCharInString(text, `
`) + 1;
  const charCount = text.length;
  try {
    const filePath = await writeToFile(text, filename);
    return `Copied to clipboard (${charCount} characters, ${lineCount} lines)
Also written to ${filePath}`;
  } catch {
    return `Copied to clipboard (${charCount} characters, ${lineCount} lines)`;
  }
}
function truncateLine(text, maxLen) {
  const firstLine = text.split(`
`)[0] ?? "";
  if (stringWidth(firstLine) <= maxLen) {
    return firstLine;
  }
  let result = "";
  let width = 0;
  const targetWidth = maxLen - 1;
  for (const char of firstLine) {
    const charWidth = stringWidth(char);
    if (width + charWidth > targetWidth)
      break;
    result += char;
    width += charWidth;
  }
  return result + "\u2026";
}
function CopyPicker({
  fullText,
  codeBlocks,
  messageAge,
  onDone
}) {
  const focusedRef = import_react.useRef("full");
  const options = [
    {
      label: "Full response",
      value: "full",
      description: `${fullText.length} chars, ${countCharInString(fullText, `
`) + 1} lines`
    },
    ...codeBlocks.map((block, index) => {
      const blockLines = countCharInString(block.code, `
`) + 1;
      return {
        label: truncateLine(block.code, 60),
        value: index,
        description: [block.lang, blockLines > 1 ? `${blockLines} lines` : undefined].filter(Boolean).join(", ") || undefined
      };
    }),
    {
      label: "Always copy full response",
      value: "always",
      description: "Skip this picker in the future (revert via /config)"
    }
  ];
  function getSelectionContent(selected) {
    if (selected === "full" || selected === "always") {
      return { text: fullText, filename: RESPONSE_FILENAME };
    }
    const block = codeBlocks[selected];
    return {
      text: block.code,
      filename: `copy${fileExtension(block.lang)}`,
      blockIndex: selected
    };
  }
  async function handleSelect(selected) {
    const content = getSelectionContent(selected);
    if (selected === "always") {
      if (!getGlobalConfig().copyFullResponse) {
        saveGlobalConfig((c) => ({ ...c, copyFullResponse: true }));
      }
      logEvent("tengu_copy", {
        block_count: codeBlocks.length,
        always: true,
        message_age: messageAge
      });
      const result2 = await copyOrWriteToFile(content.text, content.filename);
      onDone(`${result2}
Preference saved. Use /config to change copyFullResponse`);
      return;
    }
    logEvent("tengu_copy", {
      selected_block: content.blockIndex,
      block_count: codeBlocks.length,
      message_age: messageAge
    });
    const result = await copyOrWriteToFile(content.text, content.filename);
    onDone(result);
  }
  async function handleWrite(selected) {
    const content = getSelectionContent(selected);
    logEvent("tengu_copy", {
      selected_block: content.blockIndex,
      block_count: codeBlocks.length,
      message_age: messageAge,
      write_shortcut: true
    });
    try {
      const filePath = await writeToFile(content.text, content.filename);
      onDone(`Written to ${filePath}`);
    } catch (e) {
      onDone(`Failed to write file: ${e instanceof Error ? e.message : e}`);
    }
  }
  function handleKeyDown(e) {
    if (e.key === "w") {
      e.preventDefault();
      handleWrite(focusedRef.current);
    }
  }
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Pane, {
    children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
      flexDirection: "column",
      gap: 1,
      tabIndex: 0,
      autoFocus: true,
      onKeyDown: handleKeyDown,
      children: [
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          dimColor: true,
          children: "Select content to copy:"
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Select, {
          options,
          hideIndexes: false,
          onFocus: (value) => {
            focusedRef.current = value;
          },
          onChange: (selected) => {
            handleSelect(selected);
          },
          onCancel: () => {
            onDone("Copy cancelled", { display: "system" });
          }
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          dimColor: true,
          children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Byline, {
            children: [
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(KeyboardShortcutHint, {
                shortcut: "enter",
                action: "copy"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(KeyboardShortcutHint, {
                shortcut: "w",
                action: "write to file"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(KeyboardShortcutHint, {
                shortcut: "esc",
                action: "cancel"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this)
  }, undefined, false, undefined, this);
}
var import_react, jsx_dev_runtime, COPY_DIR, RESPONSE_FILENAME = "response.md", MAX_LOOKBACK = 20, call = async (onDone, context, args) => {
  const texts = collectRecentAssistantTexts(context.messages);
  if (texts.length === 0) {
    onDone("No assistant message to copy");
    return null;
  }
  let age = 0;
  const arg = args?.trim();
  if (arg) {
    const n = Number(arg);
    if (!Number.isInteger(n) || n < 1) {
      onDone(`Usage: /copy [N] where N is 1 (latest), 2, 3, \u2026 Got: ${arg}`);
      return null;
    }
    if (n > texts.length) {
      onDone(`Only ${texts.length} assistant ${texts.length === 1 ? "message" : "messages"} available to copy`);
      return null;
    }
    age = n - 1;
  }
  const text = texts[age];
  const codeBlocks = extractCodeBlocks(text);
  const config = getGlobalConfig();
  if (codeBlocks.length === 0 || config.copyFullResponse) {
    logEvent("tengu_copy", {
      always: config.copyFullResponse,
      block_count: codeBlocks.length,
      message_age: age
    });
    const result = await copyOrWriteToFile(text, RESPONSE_FILENAME);
    onDone(result);
    return null;
  }
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(CopyPicker, {
    fullText: text,
    codeBlocks,
    messageAge: age,
    onDone
  }, undefined, false, undefined, this);
};
var init_copy = __esm(() => {
  init_marked_esm();
  init_select();
  init_src();
  init_src();
  init_analytics();
  init_config();
  init_messages();
  init_stringUtils();
  import_react = __toESM(require_react(), 1);
  jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
  COPY_DIR = join(tmpdir(), "claude");
});
init_copy();

export {
  fileExtension,
  collectRecentAssistantTexts,
  call
};
