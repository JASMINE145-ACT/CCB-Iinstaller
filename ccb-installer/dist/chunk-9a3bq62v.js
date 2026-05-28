// @bun
import {
  init_sanitization,
  recursivelySanitizeUnicode
} from "./chunk-mcws22k3.js";
import {
  Select,
  getCurrentSessionTag,
  getTranscriptPath,
  init_select,
  init_sessionStorage,
  saveTag
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
import {
  Dialog,
  ThemedBox_default,
  ThemedText,
  init_source,
  init_src,
  source_default
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
import {
  COMMON_HELP_ARGS,
  COMMON_INFO_ARGS,
  init_xml
} from "./chunk-wd8mqz95.js";
import"./chunk-8tnsngw2.js";
import"./chunk-vsbyhpfy.js";
import"./chunk-p7pj6wf8.js";
import"./chunk-5z28bqne.js";
import"./chunk-qajrkk97.js";
import"./chunk-5khwvj1z.js";
import"./chunk-fbv4apne.js";
import {
  getSessionId,
  init_state
} from "./chunk-gzp6rza1.js";
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

// src/commands/tag/tag.tsx
function ConfirmRemoveTag({
  tagName,
  onConfirm,
  onCancel
}) {
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Dialog, {
    title: "Remove tag?",
    subtitle: `Current tag: #${tagName}`,
    onCancel,
    color: "warning",
    children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
      flexDirection: "column",
      gap: 1,
      children: [
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          children: "This will remove the tag from the current session."
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Select, {
          onChange: (value) => value === "yes" ? onConfirm() : onCancel(),
          options: [
            { label: "Yes, remove tag", value: "yes" },
            { label: "No, keep tag", value: "no" }
          ]
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this)
  }, undefined, false, undefined, this);
}
function ToggleTagAndClose({
  tagName,
  onDone
}) {
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [sessionId, setSessionId] = React.useState(null);
  const normalizedTag = recursivelySanitizeUnicode(tagName).trim();
  React.useEffect(() => {
    const id = getSessionId();
    if (!id) {
      onDone("No active session to tag", { display: "system" });
      return;
    }
    if (!normalizedTag) {
      onDone("Tag name cannot be empty", { display: "system" });
      return;
    }
    setSessionId(id);
    const currentTag = getCurrentSessionTag(id);
    if (currentTag === normalizedTag) {
      logEvent("tengu_tag_command_remove_prompt", {});
      setShowConfirm(true);
    } else {
      const isReplacing = !!currentTag;
      logEvent("tengu_tag_command_add", { is_replacing: isReplacing });
      (async () => {
        const fullPath = getTranscriptPath();
        await saveTag(id, normalizedTag, fullPath);
        onDone(`Tagged session with ${source_default.cyan(`#${normalizedTag}`)}`, {
          display: "system"
        });
      })();
    }
  }, [normalizedTag, onDone]);
  if (showConfirm && sessionId) {
    return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ConfirmRemoveTag, {
      tagName: normalizedTag,
      onConfirm: async () => {
        logEvent("tengu_tag_command_remove_confirmed", {});
        const fullPath = getTranscriptPath();
        await saveTag(sessionId, "", fullPath);
        onDone(`Removed tag ${source_default.cyan(`#${normalizedTag}`)}`, {
          display: "system"
        });
      },
      onCancel: () => {
        logEvent("tengu_tag_command_remove_cancelled", {});
        onDone(`Kept tag ${source_default.cyan(`#${normalizedTag}`)}`, {
          display: "system"
        });
      }
    }, undefined, false, undefined, this);
  }
  return null;
}
function ShowHelp({
  onDone
}) {
  React.useEffect(() => {
    onDone(`Usage: /tag <tag-name>

Toggle a searchable tag on the current session.
Run the same command again to remove the tag.
Tags are displayed after the branch name in /resume and can be searched with /.

Examples:
  /tag bugfix        # Add tag
  /tag bugfix        # Remove tag (toggle)
  /tag feature-auth
  /tag wip`, { display: "system" });
  }, [onDone]);
  return null;
}
async function call(onDone, _context, args) {
  args = args?.trim() || "";
  if (COMMON_INFO_ARGS.includes(args) || COMMON_HELP_ARGS.includes(args)) {
    return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ShowHelp, {
      onDone
    }, undefined, false, undefined, this);
  }
  if (!args) {
    return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ShowHelp, {
      onDone
    }, undefined, false, undefined, this);
  }
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ToggleTagAndClose, {
    tagName: args,
    onDone
  }, undefined, false, undefined, this);
}
var React, jsx_dev_runtime;
var init_tag = __esm(() => {
  init_source();
  init_state();
  init_select();
  init_src();
  init_xml();
  init_src();
  init_analytics();
  init_sanitization();
  init_sessionStorage();
  React = __toESM(require_react(), 1);
  jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
});
init_tag();

export {
  call
};
