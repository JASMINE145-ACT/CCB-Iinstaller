// @bun
import {
  checkInstall,
  cleanupNpmInstallations,
  cleanupShellAliases,
  init_nativeInstaller,
  installLatest
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
  getInitialSettings,
  init_settings1 as init_settings,
  updateSettingsForSource
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
import {
  env,
  init_env
} from "./chunk-9qh5f9r3.js";
import"./chunk-xhesahm0.js";
import"./chunk-rh5a2rg9.js";
import"./chunk-p2816w9z.js";
import"./chunk-v9smspw2.js";
import"./chunk-v1kzp02e.js";
import"./chunk-padf4crh.js";
import"./chunk-crmjpsqe.js";
import {
  StatusIcon,
  ThemedBox_default,
  ThemedText,
  init_src,
  root_default
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
import {
  errorMessage,
  init_debug,
  init_errors,
  logForDebugging
} from "./chunk-5khwvj1z.js";
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
  __toESM
} from "./chunk-qp2qdcda.js";

// src/commands/install.tsx
init_analytics();
init_src();
init_src();
init_debug();
init_env();
init_errors();
init_nativeInstaller();
init_settings();
var import_react = __toESM(require_react(), 1);
var jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
import { homedir } from "os";
import { join } from "path";
function getInstallationPath() {
  const isWindows = env.platform === "win32";
  const homeDir = homedir();
  if (isWindows) {
    const windowsPath = join(homeDir, ".local", "bin", "claude.exe");
    return windowsPath.replace(/\//g, "\\");
  }
  return "~/.local/bin/claude";
}
function SetupNotes({ messages }) {
  if (messages.length === 0)
    return null;
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
    flexDirection: "column",
    gap: 0,
    marginBottom: 1,
    children: [
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          color: "warning",
          children: [
            /* @__PURE__ */ jsx_dev_runtime.jsxDEV(StatusIcon, {
              status: "warning",
              withSpace: true
            }, undefined, false, undefined, this),
            "Setup notes:"
          ]
        }, undefined, true, undefined, this)
      }, undefined, false, undefined, this),
      messages.map((message, index) => /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        marginLeft: 2,
        children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
          dimColor: true,
          children: [
            "\u2022 ",
            message
          ]
        }, undefined, true, undefined, this)
      }, index, false, undefined, this))
    ]
  }, undefined, true, undefined, this);
}
function Install({ onDone, force, target }) {
  const [state, setState] = import_react.useState({ type: "checking" });
  import_react.useEffect(() => {
    async function run() {
      try {
        logForDebugging(`Install: Starting installation process (force=${force}, target=${target})`);
        const channelOrVersion = target || getInitialSettings()?.autoUpdatesChannel || "latest";
        setState({ type: "installing", version: channelOrVersion });
        logForDebugging(`Install: Calling installLatest(channelOrVersion=${channelOrVersion}, forceReinstall=${force})`);
        const result = await installLatest(channelOrVersion, force);
        logForDebugging(`Install: installLatest returned version=${result.latestVersion}, wasUpdated=${result.wasUpdated}, lockFailed=${result.lockFailed}`);
        if (result.lockFailed) {
          throw new Error("Could not install - another process is currently installing Claude. Please try again in a moment.");
        }
        if (!result.latestVersion) {
          logForDebugging("Install: Failed to retrieve version information during install", { level: "error" });
        }
        if (!result.wasUpdated) {
          logForDebugging("Install: Already up to date");
        }
        setState({ type: "setting-up" });
        const setupMessages = await checkInstall(true);
        logForDebugging(`Install: Setup launcher completed with ${setupMessages.length} messages`);
        if (setupMessages.length > 0) {
          setupMessages.forEach((msg) => logForDebugging(`Install: Setup message: ${msg.message}`));
        }
        logForDebugging("Install: Cleaning up npm installations after successful install");
        const { removed, errors, warnings } = await cleanupNpmInstallations();
        if (removed > 0) {
          logForDebugging(`Cleaned up ${removed} npm installation(s)`);
        }
        if (errors.length > 0) {
          logForDebugging(`Cleanup errors: ${errors.join(", ")}`);
        }
        const aliasMessages = await cleanupShellAliases();
        if (aliasMessages.length > 0) {
          logForDebugging(`Shell alias cleanup: ${aliasMessages.map((m) => m.message).join("; ")}`);
        }
        logEvent("tengu_claude_install_command", {
          has_version: result.latestVersion ? 1 : 0,
          forced: force ? 1 : 0
        });
        if (target === "latest" || target === "stable") {
          updateSettingsForSource("userSettings", {
            autoUpdatesChannel: target
          });
          logForDebugging(`Install: Saved autoUpdatesChannel=${target} to user settings`);
        }
        const allWarnings = [...warnings, ...aliasMessages.map((m) => m.message)];
        if (setupMessages.length > 0) {
          setState({
            type: "set-up",
            messages: setupMessages.map((m) => m.message)
          });
          setTimeout(setState, 2000, {
            type: "success",
            version: result.latestVersion || "current",
            setupMessages: [
              ...setupMessages.map((m) => m.message),
              ...allWarnings
            ]
          });
        } else {
          logForDebugging("Install: Shell PATH already configured");
          setState({
            type: "success",
            version: result.latestVersion || "current",
            setupMessages: allWarnings.length > 0 ? allWarnings : undefined
          });
        }
      } catch (error) {
        logForDebugging(`Install command failed: ${error}`, {
          level: "error"
        });
        setState({
          type: "error",
          message: errorMessage(error)
        });
      }
    }
    run();
  }, [force, target]);
  import_react.useEffect(() => {
    if (state.type === "success") {
      setTimeout(onDone, 2000, "Claude Code installation completed successfully", {
        display: "system"
      });
    } else if (state.type === "error") {
      setTimeout(onDone, 3000, "Claude Code installation failed", {
        display: "system"
      });
    }
  }, [state, onDone]);
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
    flexDirection: "column",
    marginTop: 1,
    children: [
      state.type === "checking" && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
        color: "claude",
        children: "Checking installation status..."
      }, undefined, false, undefined, this),
      state.type === "cleaning-npm" && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
        color: "warning",
        children: "Cleaning up old npm installations..."
      }, undefined, false, undefined, this),
      state.type === "installing" && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
        color: "claude",
        children: [
          "Installing Claude Code native build ",
          state.version,
          "..."
        ]
      }, undefined, true, undefined, this),
      state.type === "setting-up" && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
        color: "claude",
        children: "Setting up launcher and shell integration..."
      }, undefined, false, undefined, this),
      state.type === "set-up" && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(SetupNotes, {
        messages: state.messages
      }, undefined, false, undefined, this),
      state.type === "success" && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        flexDirection: "column",
        gap: 1,
        children: [
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
            children: [
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(StatusIcon, {
                status: "success",
                withSpace: true
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                color: "success",
                bold: true,
                children: "Claude Code successfully installed!"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
            marginLeft: 2,
            flexDirection: "column",
            gap: 1,
            children: [
              state.version !== "current" && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
                children: [
                  /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: "Version: "
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                    color: "claude",
                    children: state.version
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
                children: [
                  /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                    dimColor: true,
                    children: "Location: "
                  }, undefined, false, undefined, this),
                  /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                    color: "text",
                    children: getInstallationPath()
                  }, undefined, false, undefined, this)
                ]
              }, undefined, true, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
            marginLeft: 2,
            flexDirection: "column",
            gap: 1,
            children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
              marginTop: 1,
              children: [
                /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                  dimColor: true,
                  children: "Next: Run "
                }, undefined, false, undefined, this),
                /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                  color: "claude",
                  bold: true,
                  children: "claude --help"
                }, undefined, false, undefined, this),
                /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                  dimColor: true,
                  children: " to get started"
                }, undefined, false, undefined, this)
              ]
            }, undefined, true, undefined, this)
          }, undefined, false, undefined, this),
          state.setupMessages && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(SetupNotes, {
            messages: state.setupMessages
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      state.type === "error" && /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
        flexDirection: "column",
        gap: 1,
        children: [
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
            children: [
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(StatusIcon, {
                status: "error",
                withSpace: true
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
                color: "error",
                children: "Installation failed"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
            color: "error",
            children: state.message
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedBox_default, {
            marginTop: 1,
            children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(ThemedText, {
              dimColor: true,
              children: "Try running with --force to override checks"
            }, undefined, false, undefined, this)
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}
var install = {
  type: "local-jsx",
  name: "install",
  description: "Install Claude Code native build",
  argumentHint: "[options]",
  async call(onDone, _context, args) {
    const force = args.includes("--force");
    const nonFlagArgs = args.filter((arg) => !arg.startsWith("--"));
    const target = nonFlagArgs[0];
    const { unmount } = await root_default(/* @__PURE__ */ jsx_dev_runtime.jsxDEV(Install, {
      onDone: (result, options) => {
        unmount();
        onDone(result, options);
      },
      force,
      target
    }, undefined, false, undefined, this));
  }
};
export {
  install
};
