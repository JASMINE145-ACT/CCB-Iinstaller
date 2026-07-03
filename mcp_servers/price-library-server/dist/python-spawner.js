import { spawn } from "child_process";
import { config } from "./config";
const PYTHON_TIMEOUT_MS = Number(process.env.PRICE_LIBRARY_PYTHON_TIMEOUT_MS ?? 90000);
function parseLastJsonLine(stdout) {
    const lines = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const last = lines.at(-1);
    if (!last) {
        return { success: false, error: "Python produced no JSON output" };
    }
    return JSON.parse(last);
}
export async function callPythonTool(tool, params) {
    return new Promise((resolveResult) => {
        const pythonCmd = process.env.PYTHON_EXECUTABLE ?? (process.platform === "win32" ? "python" : "python3");
        const spawnEnv = {
            ...process.env,
            PYTHONIOENCODING: process.env.PYTHONIOENCODING ?? "utf-8",
            PYTHONUTF8: process.env.PYTHONUTF8 ?? "1",
            PYTHONNOUSERSITE: process.env.PYTHONNOUSERSITE ?? "1",
        };
        const proc = spawn(pythonCmd, [config.pythonEntry], {
            cwd: config.projectRoot,
            env: spawnEnv,
            stdio: ["pipe", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        let settled = false;
        const finish = (result) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            resolveResult(result);
        };
        const timer = setTimeout(() => {
            proc.kill();
            finish({ success: false, error: `Python call timed out after ${PYTHON_TIMEOUT_MS}ms` });
        }, PYTHON_TIMEOUT_MS);
        proc.stdout.on("data", (data) => {
            stdout += data.toString();
        });
        proc.stderr.on("data", (data) => {
            stderr += data.toString();
        });
        proc.on("error", (err) => {
            finish({
                success: false,
                error: `Failed to spawn Python: ${err.message}. Set PYTHON_EXECUTABLE if Python is not on PATH.`,
            });
        });
        proc.on("close", (code) => {
            if (settled)
                return;
            try {
                const parsed = parseLastJsonLine(stdout);
                if (!parsed.success && stderr) {
                    parsed.error = `${parsed.error ?? "Python tool failed"}\n${stderr.trim()}`;
                }
                finish(parsed);
            }
            catch (err) {
                finish({
                    success: false,
                    error: `Failed to parse Python output (exit ${code ?? "unknown"}): ${String(err)}\nstdout=${stdout}\nstderr=${stderr}`,
                });
            }
        });
        proc.stdin.write(`${JSON.stringify({ tool, params })}\n`);
        proc.stdin.end();
    });
}
