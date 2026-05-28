// @bun
import {
  __esm
} from "./chunk-qp2qdcda.js";

// src/utils/ndjsonFramer.ts
function attachNdjsonFramer(socket, onMessage, parse = (text) => JSON.parse(text)) {
  let buffer = "";
  socket.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(`
`);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim())
        continue;
      try {
        onMessage(parse(line));
      } catch {}
    }
  });
}
var init_ndjsonFramer = () => {};

export { attachNdjsonFramer, init_ndjsonFramer };
