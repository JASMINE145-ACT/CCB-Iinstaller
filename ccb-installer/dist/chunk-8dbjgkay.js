// @bun
import {
  ConfigurableShortcutHint,
  capitalize_default,
  estimateSkillFrontmatterTokens,
  getCommandName,
  getSkillsPath,
  init_ConfigurableShortcutHint,
  init_capitalize,
  init_commands1 as init_commands,
  init_loadSkillsDir
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
  getDisplayPath,
  getSettingSourceName,
  init_constants,
  init_file,
  init_stringUtils,
  plural
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
import {
  formatTokens,
  init_format
} from "./chunk-padf4crh.js";
import"./chunk-crmjpsqe.js";
import {
  Dialog,
  ThemedBox_default,
  ThemedText,
  init_src
} from "./chunk-z9bw4q7j.js";
import {
  require_jsx_dev_runtime,
  require_react
} from "./chunk-evwb3c85.js";
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

// src/components/skills/SkillsMenu.tsx
function getSourceTitle(source) {
  if (source === "plugin") {
    return "\u63d2\u4ef6\u6280\u80fd";
  }
  if (source === "mcp") {
    return "MCP \u6280\u80fd";
  }
  return `${capitalize_default(getSettingSourceName(source))} \u6280\u80fd`;
}
function getSourceSubtitle(source, skills) {
  if (source === "mcp") {
    const servers = [
      ...new Set(skills.map((s) => {
        const idx = s.name.indexOf(":");
        return idx > 0 ? s.name.slice(0, idx) : null;
      }).filter((n) => n != null))
    ];
    return servers.length > 0 ? servers.join(", ") : undefined;
  }
  const skillsPath = getDisplayPath(getSkillsPath(source, "skills"));
  const hasCommandsSkills = skills.some((s) => s.loadedFrom === "commands_DEPRECATED");
  return hasCommandsSkills ? `${skillsPath}, ${getDisplayPath(getSkillsPath(source, "commands"))}` : skillsPath;
}
function SkillsMenu({ onExit, commands }) {
  const skills = import_react.useMemo(() => {
    return commands.filter((cmd) => cmd.type === "prompt" && (cmd.loadedFrom === "skills" || cmd.loadedFrom === "commands_DEPRECATED" || cmd.loadedFrom === "plugin" || cmd.loadedFrom === "mcp"));
  }, [commands]);
  const skillsBySource = import_react.useMemo(() => {
    const groups = {
      policySettings: [],
      userSettings: [],
      projectSettings: [],
      localSettings: [],
      flagSettings: [],
      plugin: [],
      mcp: []
    };
    for (const skill of skills) {
      const source = skill.source;
      if (source in groups) {
        groups[source].push(skill);
      }
    }
    for (const group of Object.values(groups)) {
      group.sort((a, b) => getCommandName(a).localeCompare(getCommandName(b)));
    }
    return groups;
  }, [skills]);
  const handleCancel = () => {
    onExit("\u6280\u80fd\u5bf9\u8bdd\u6846\u5df2\u5173\u95ed", { display: "system" });
  };
  if (skills.length === 0) {
    return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Dialog, {
      title: "\u6280\u80fd",
      subtitle: "\u672a\u627e\u5230\u6280\u80fd",
      onCancel: handleCancel,
      hideInputGuide: true,
      children: [
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          dimColor: true,
          children: "\u5728 .claude/skills/ \u6216 ~/.claude/skills/ \u4e2d\u521b\u5efa\u6280\u80fd"
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          dimColor: true,
          italic: true,
          children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ConfigurableShortcutHint, {
            action: "confirm:no",
            context: "Confirmation",
            fallback: "Esc",
            description: "\u5173\u95ed"
          }, undefined, false, undefined, this)
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this);
  }
  const getScopeTag = (source) => {
    switch (source) {
      case "projectSettings":
      case "localSettings":
        return { label: "\u672c\u5730", color: "yellow" };
      case "userSettings":
        return { label: "\u5168\u5c40", color: "cyan" };
      case "policySettings":
        return { label: "\u6258\u7ba1", color: "magenta" };
      default:
        return;
    }
  };
  const renderSkill = (skill) => {
    const estimatedTokens = estimateSkillFrontmatterTokens(skill);
    const tokenDisplay = `~${formatTokens(estimatedTokens)}`;
    const pluginName = skill.source === "plugin" ? skill.pluginInfo?.pluginManifest.name : undefined;
    const scopeTag = getScopeTag(skill.source);
    return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
      children: [
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          children: getCommandName(skill)
        }, undefined, false, undefined, this),
        scopeTag && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          color: scopeTag.color,
          children: [
            " [",
            scopeTag.label,
            "]"
          ]
        }, undefined, true, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          dimColor: true,
          children: [
            pluginName ? ` \xB7 ${pluginName}` : "",
            " \xB7 ",
            tokenDisplay,
            " \u63cf\u8ff0 tokens"
          ]
        }, undefined, true, undefined, this)
      ]
    }, `${skill.name}-${skill.source}`, true, undefined, this);
  };
  const renderSkillGroup = (source) => {
    const groupSkills = skillsBySource[source];
    if (groupSkills.length === 0)
      return null;
    const title = getSourceTitle(source);
    const subtitle = getSourceSubtitle(source, groupSkills);
    return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
      flexDirection: "column",
      children: [
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
          children: [
            /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
              bold: true,
              dimColor: true,
              children: title
            }, undefined, false, undefined, this),
            subtitle && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
              dimColor: true,
              children: [
                " (",
                subtitle,
                ")"
              ]
            }, undefined, true, undefined, this)
          ]
        }, undefined, true, undefined, this),
        groupSkills.map((skill) => renderSkill(skill))
      ]
    }, source, true, undefined, this);
  };
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Dialog, {
    title: "\u6280\u80fd",
    subtitle: `\u5171 ${skills.length} \u4e2a\u6280\u80fd`,
    onCancel: handleCancel,
    hideInputGuide: true,
    children: [
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        flexDirection: "column",
        gap: 1,
        children: [
          renderSkillGroup("projectSettings"),
          renderSkillGroup("localSettings"),
          renderSkillGroup("userSettings"),
          renderSkillGroup("flagSettings"),
          renderSkillGroup("policySettings"),
          renderSkillGroup("plugin"),
          renderSkillGroup("mcp")
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
        dimColor: true,
        italic: true,
        children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "\u5173\u95ed"
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
var import_react, jsx_dev_runtime;
var init_SkillsMenu = __esm(() => {
  init_capitalize();
  init_commands();
  init_src();
  init_loadSkillsDir();
  init_file();
  init_format();
  init_constants();
  init_stringUtils();
  init_ConfigurableShortcutHint();
  init_src();
  import_react = __toESM(require_react(), 1);
  jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
});

// src/commands/skills/skills.tsx
async function call(onDone, context) {
  return /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(SkillsMenu, {
    onExit: onDone,
    commands: context.options.commands
  }, undefined, false, undefined, this);
}
var jsx_dev_runtime2;
var init_skills = __esm(() => {
  init_SkillsMenu();
  jsx_dev_runtime2 = __toESM(require_jsx_dev_runtime(), 1);
});
init_skills();

export {
  call
};
