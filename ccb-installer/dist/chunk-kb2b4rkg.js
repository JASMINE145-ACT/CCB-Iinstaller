// @bun
import {
  init_browser,
  openBrowser
} from "./chunk-f57cvf1d.js";
import"./chunk-hnxmafvc.js";
import"./chunk-tv74hgw9.js";
import"./chunk-wd8mqz95.js";
import"./chunk-8tnsngw2.js";
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
import {
  __esm
} from "./chunk-qp2qdcda.js";

// src/commands/stickers/stickers.ts
async function call() {
  const url = "https://www.stickermule.com/claudecode";
  const success = await openBrowser(url);
  if (success) {
    return { type: "text", value: "Opening sticker page in browser\u2026" };
  } else {
    return {
      type: "text",
      value: `Failed to open browser. Visit: ${url}`
    };
  }
}
var init_stickers = __esm(() => {
  init_browser();
});
init_stickers();

export {
  call
};
