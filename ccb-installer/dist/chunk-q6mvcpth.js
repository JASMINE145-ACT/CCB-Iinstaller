// @bun
import {
  PromptInputHelpMenu,
  init_PromptInputHelpMenu
} from "./chunk-216taps3.js";
import {
  init_modalContext,
  useIsInsideModal
} from "./chunk-gg8qhy7g.js";
import {
  INTERNAL_ONLY_COMMANDS,
  Select,
  builtInCommandNames,
  formatDescriptionWithSource,
  init_commands1 as init_commands,
  init_select,
  init_useShortcutDisplay,
  init_useTerminalSize,
  useShortcutDisplay
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
import {
  init_useExitOnCtrlCDWithKeybindings,
  useExitOnCtrlCDWithKeybindings
} from "./chunk-w7xjra5m.js";
import"./chunk-zttmdag3.js";
import"./chunk-smxezvfx.js";
import"./chunk-7ac6mws7.js";
import"./chunk-ps49ymvj.js";
import"./chunk-chzfw06n.js";
import {
  init_useKeybinding
} from "./chunk-s2x040y6.js";
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
import {
  init_truncate,
  truncate
} from "./chunk-padf4crh.js";
import"./chunk-crmjpsqe.js";
import {
  Link,
  Pane,
  Tab,
  Tabs,
  ThemedBox_default,
  ThemedText,
  init_src,
  useKeybinding,
  useTabHeaderFocus,
  useTerminalSize
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

// src/components/HelpV2/Commands.tsx
function Commands({
  commands,
  maxHeight,
  columns,
  title,
  onCancel,
  emptyMessage
}) {
  const { headerFocused, focusHeader } = useTabHeaderFocus();
  const maxWidth = Math.max(1, columns - 10);
  const visibleCount = Math.max(1, Math.floor((maxHeight - 10) / 2));
  const options = import_react.useMemo(() => {
    const seen = new Set;
    return commands.filter((cmd) => {
      if (seen.has(cmd.name))
        return false;
      seen.add(cmd.name);
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name)).map((cmd) => ({
      label: `/${cmd.name}`,
      value: cmd.name,
      description: truncate(formatDescriptionWithSource(cmd), maxWidth, true)
    }));
  }, [commands, maxWidth]);
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
    flexDirection: "column",
    paddingY: 1,
    children: commands.length === 0 && emptyMessage ? /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
      dimColor: true,
      children: emptyMessage
    }, undefined, false, undefined, this) : /* @__PURE__ */ jsx_dev_runtime.jsxDEV(jsx_dev_runtime.Fragment, {
      children: [
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          children: title
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
          marginTop: 1,
          children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Select, {
            options,
            visibleOptionCount: visibleCount,
            onCancel,
            disableSelection: true,
            hideIndexes: true,
            layout: "compact-vertical",
            onUpFromFirstItem: focusHeader,
            isDisabled: headerFocused
          }, undefined, false, undefined, this)
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this)
  }, undefined, false, undefined, this);
}
var import_react, jsx_dev_runtime;
var init_Commands = __esm(() => {
  init_commands();
  init_truncate();
  init_src();
  init_select();
  import_react = __toESM(require_react(), 1);
  jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
});

// src/components/HelpV2/General.tsx
function General() {
  return /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
    flexDirection: "column",
    paddingY: 1,
    gap: 1,
    children: [
      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
        children: /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
          children: "Claude understands your codebase, makes edits with your permission, and executes commands \u2014 right from your terminal."
        }, undefined, false, undefined, this)
      }, undefined, false, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
        flexDirection: "column",
        children: [
          /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedBox_default, {
            children: /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(ThemedText, {
              bold: true,
              children: "Shortcuts"
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime2.jsxDEV(PromptInputHelpMenu, {
            gap: 2,
            fixedWidth: true
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
var jsx_dev_runtime2;
var init_General = __esm(() => {
  init_src();
  init_PromptInputHelpMenu();
  jsx_dev_runtime2 = __toESM(require_jsx_dev_runtime(), 1);
});

// src/components/HelpV2/HelpV2.tsx
function HelpV2({ onClose, commands }) {
  const { rows, columns } = useTerminalSize();
  const maxHeight = Math.floor(rows / 2);
  const insideModal = useIsInsideModal();
  const close = () => onClose("Help dialog dismissed", { display: "system" });
  useKeybinding("help:dismiss", close, { context: "Help" });
  const exitState = useExitOnCtrlCDWithKeybindings(close);
  const dismissShortcut = useShortcutDisplay("help:dismiss", "Help", "esc");
  const builtinNames = builtInCommandNames();
  let builtinCommands = commands.filter((cmd) => builtinNames.has(cmd.name) && !cmd.isHidden);
  let antOnlyCommands = [];
  if (process.env.USER_TYPE === "ant") {
    const internalOnlyNames = new Set(INTERNAL_ONLY_COMMANDS.map((_) => _.name));
    builtinCommands = builtinCommands.filter((cmd) => !internalOnlyNames.has(cmd.name));
    antOnlyCommands = commands.filter((cmd) => internalOnlyNames.has(cmd.name) && !cmd.isHidden);
  }
  const customCommands = commands.filter((cmd) => !builtinNames.has(cmd.name) && !cmd.isHidden);
  const tabs = [
    /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(Tab, {
      title: "general",
      children: /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(General, {}, undefined, false, undefined, this)
    }, "general", false, undefined, this)
  ];
  tabs.push(/* @__PURE__ */ jsx_dev_runtime3.jsxDEV(Tab, {
    title: "commands",
    children: /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(Commands, {
      commands: builtinCommands,
      maxHeight,
      columns,
      title: "Browse default commands:",
      onCancel: close
    }, undefined, false, undefined, this)
  }, "commands", false, undefined, this));
  tabs.push(/* @__PURE__ */ jsx_dev_runtime3.jsxDEV(Tab, {
    title: "custom-commands",
    children: /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(Commands, {
      commands: customCommands,
      maxHeight,
      columns,
      title: "Browse custom commands:",
      emptyMessage: "No custom commands found",
      onCancel: close
    }, undefined, false, undefined, this)
  }, "custom", false, undefined, this));
  if (process.env.USER_TYPE === "ant" && antOnlyCommands.length > 0) {
    tabs.push(/* @__PURE__ */ jsx_dev_runtime3.jsxDEV(Tab, {
      title: "[ant-only]",
      children: /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(Commands, {
        commands: antOnlyCommands,
        maxHeight,
        columns,
        title: "Browse ant-only commands:",
        onCancel: close
      }, undefined, false, undefined, this)
    }, "ant-only", false, undefined, this));
  }
  return /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedBox_default, {
    flexDirection: "column",
    height: insideModal ? undefined : maxHeight,
    children: /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(Pane, {
      color: "professionalBlue",
      children: [
        /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(Tabs, {
          title: process.env.USER_TYPE === "ant" ? "/help" : `Claude Code v${"2.1.888"}`,
          color: "professionalBlue",
          defaultTab: "general",
          children: tabs
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedBox_default, {
          marginTop: 1,
          children: /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            children: [
              "For more help:",
              " ",
              /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(Link, {
                url: "https://code.claude.com/docs/en/overview"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        }, undefined, false, undefined, this),
        /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedBox_default, {
          marginTop: 1,
          children: /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
            dimColor: true,
            children: exitState.pending ? /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(jsx_dev_runtime3.Fragment, {
              children: [
                "Press ",
                exitState.keyName,
                " again to exit"
              ]
            }, undefined, true, undefined, this) : /* @__PURE__ */ jsx_dev_runtime3.jsxDEV(ThemedText, {
              italic: true,
              children: [
                dismissShortcut,
                " to cancel"
              ]
            }, undefined, true, undefined, this)
          }, undefined, false, undefined, this)
        }, undefined, false, undefined, this)
      ]
    }, undefined, true, undefined, this)
  }, undefined, false, undefined, this);
}
var jsx_dev_runtime3;
var init_HelpV2 = __esm(() => {
  init_useExitOnCtrlCDWithKeybindings();
  init_useShortcutDisplay();
  init_commands();
  init_modalContext();
  init_useTerminalSize();
  init_src();
  init_useKeybinding();
  init_Commands();
  init_General();
  jsx_dev_runtime3 = __toESM(require_jsx_dev_runtime(), 1);
});

// src/commands/help/help.tsx
var jsx_dev_runtime4, call = async (onDone, { options: { commands } }) => {
  return /* @__PURE__ */ jsx_dev_runtime4.jsxDEV(HelpV2, {
    commands,
    onClose: onDone
  }, undefined, false, undefined, this);
};
var init_help = __esm(() => {
  init_HelpV2();
  jsx_dev_runtime4 = __toESM(require_jsx_dev_runtime(), 1);
});
init_help();

export {
  call
};
