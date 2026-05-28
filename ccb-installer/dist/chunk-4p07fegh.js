// @bun
import {
  init_useVoice,
  normalizeLanguageForSTT
} from "./chunk-r7h14mkc.js";
import"./chunk-yzhz2rmd.js";
import {
  getShortcutDisplay,
  init_changeDetector,
  init_shortcutFormat,
  settingsChangeDetector
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
import {
  init_voiceModeEnabled,
  isVoiceModeEnabled
} from "./chunk-51pnrq77.js";
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
  getGlobalConfig,
  getInitialSettings,
  init_auth,
  init_config1 as init_config,
  init_settings1 as init_settings,
  isAnthropicAuthEnabled,
  saveGlobalConfig,
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
  __require
} from "./chunk-qp2qdcda.js";

// src/commands/voice/voice.ts
var LANG_HINT_MAX_SHOWS = 2, call = async () => {
  if (!isVoiceModeEnabled()) {
    if (!isAnthropicAuthEnabled()) {
      return {
        type: "text",
        value: "Voice mode requires a Claude.ai account. Please run /login to sign in."
      };
    }
    return {
      type: "text",
      value: "Voice mode is not available."
    };
  }
  const currentSettings = getInitialSettings();
  const isCurrentlyEnabled = currentSettings.voiceEnabled === true;
  if (isCurrentlyEnabled) {
    const result2 = updateSettingsForSource("userSettings", {
      voiceEnabled: false
    });
    if (result2.error) {
      return {
        type: "text",
        value: "Failed to update settings. Check your settings file for syntax errors."
      };
    }
    settingsChangeDetector.notifyChange("userSettings");
    logEvent("tengu_voice_toggled", { enabled: false });
    return {
      type: "text",
      value: "Voice mode disabled."
    };
  }
  const { isVoiceStreamAvailable } = await import("./chunk-f1zeys91.js");
  const { checkRecordingAvailability } = await import("./chunk-d4qdesrx.js");
  const recording = await checkRecordingAvailability();
  if (!recording.available) {
    return {
      type: "text",
      value: recording.reason ?? "Voice mode is not available in this environment."
    };
  }
  if (!isVoiceStreamAvailable()) {
    return {
      type: "text",
      value: "Voice mode requires a Claude.ai account. Please run /login to sign in."
    };
  }
  const { checkVoiceDependencies, requestMicrophonePermission } = await import("./chunk-d4qdesrx.js");
  const deps = await checkVoiceDependencies();
  if (!deps.available) {
    const hint = deps.installCommand ? `
Install audio recording tools? Run: ${deps.installCommand}` : `
Install SoX manually for audio recording.`;
    return {
      type: "text",
      value: `No audio recording tool found.${hint}`
    };
  }
  if (!await requestMicrophonePermission()) {
    let guidance;
    if (process.platform === "win32") {
      guidance = "Settings \u2192 Privacy \u2192 Microphone";
    } else if (process.platform === "linux") {
      guidance = "your system's audio settings";
    } else {
      guidance = "System Settings \u2192 Privacy & Security \u2192 Microphone";
    }
    return {
      type: "text",
      value: `Microphone access is denied. To enable it, go to ${guidance}, then run /voice again.`
    };
  }
  const result = updateSettingsForSource("userSettings", { voiceEnabled: true });
  if (result.error) {
    return {
      type: "text",
      value: "Failed to update settings. Check your settings file for syntax errors."
    };
  }
  settingsChangeDetector.notifyChange("userSettings");
  logEvent("tengu_voice_toggled", { enabled: true });
  const key = getShortcutDisplay("voice:pushToTalk", "Chat", "Space");
  const stt = normalizeLanguageForSTT(currentSettings.language);
  const cfg = getGlobalConfig();
  const langChanged = cfg.voiceLangHintLastLanguage !== stt.code;
  const priorCount = langChanged ? 0 : cfg.voiceLangHintShownCount ?? 0;
  const showHint = !stt.fellBackFrom && priorCount < LANG_HINT_MAX_SHOWS;
  let langNote = "";
  if (stt.fellBackFrom) {
    langNote = ` Note: "${stt.fellBackFrom}" is not a supported dictation language; using English. Change it via /config.`;
  } else if (showHint) {
    langNote = ` Dictation language: ${stt.code} (/config to change).`;
  }
  if (langChanged || showHint) {
    saveGlobalConfig((prev) => ({
      ...prev,
      voiceLangHintShownCount: priorCount + (showHint ? 1 : 0),
      voiceLangHintLastLanguage: stt.code
    }));
  }
  return {
    type: "text",
    value: `Voice mode enabled. Hold ${key} to record.${langNote}`
  };
};
var init_voice = __esm(() => {
  init_useVoice();
  init_shortcutFormat();
  init_analytics();
  init_auth();
  init_config();
  init_changeDetector();
  init_settings();
  init_voiceModeEnabled();
});
init_voice();

export {
  call
};
