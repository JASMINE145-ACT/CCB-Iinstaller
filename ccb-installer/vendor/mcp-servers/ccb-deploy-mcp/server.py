#!/usr/bin/env python3
"""
CCB Deploy MCP Server

Developer tool for deploying CCB / CCB-Wanding releases to the update server.

Tools:
  deploy_version     — Upload exe + update version.json in one step
  get_manifest       — Fetch current version.json from server
  list_remote_files  — List files in server update directory
  upload_installer   — Upload a single .exe to server
  update_manifest    — Overwrite version.json on server

Server: 67.216.206.3  SSH port: 39222  user: root
Auth:   CCB_DEPLOY_SSH_PASSWORD env var (or SSH key if set up)
"""

import json
import os
import sys
from typing import Any

try:
    import paramiko
    from paramiko import SSHClient, AutoAddPolicy
    from paramiko.sftp_client import SFTPClient
except ImportError:
    print("Error: paramiko not found. pip install paramiko", file=sys.stderr)
    sys.exit(1)

try:
    from mcp.server import Server
    from mcp.server.stdio import stdio_server
    from mcp.types import Tool, TextContent
except ImportError:
    print("Error: mcp package not found. pip install mcp", file=sys.stderr)
    sys.exit(1)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SSH_HOST = "67.216.206.3"
SSH_PORT = 39222
SSH_USER = "root"
SSH_PASSWORD = os.environ.get("CCB_DEPLOY_SSH_PASSWORD", "")

REMOTE_ROOTS: dict[str, str] = {
    "CCB-Wanding": "/var/www/html/ccb-wanding",
    "CCB":         "/var/www/html/ccb",
}

LOCAL_INSTALLER_DIR = r"d:\Projects\claude-code-best\ccb-installer"

HTTP_BASES: dict[str, str] = {
    "CCB-Wanding": "http://67.216.206.3/ccb-wanding",
    "CCB":         "http://67.216.206.3/ccb",
}

# ---------------------------------------------------------------------------
# SSH / SFTP helpers
# ---------------------------------------------------------------------------

def _connect() -> SSHClient:
    client = SSHClient()
    client.set_missing_host_key_policy(AutoAddPolicy())
    client.banner_timeout = 30
    kwargs: dict[str, Any] = {
        "hostname": SSH_HOST,
        "port": SSH_PORT,
        "username": SSH_USER,
        "timeout": 30,
    }
    if SSH_PASSWORD:
        kwargs["password"] = SSH_PASSWORD
        kwargs["look_for_keys"] = False
        kwargs["allow_agent"] = False
    client.connect(**kwargs)
    return client


def ssh_exec(cmd: str) -> tuple[int, str, str]:
    with _connect() as client:
        _, stdout, stderr = client.exec_command(cmd, timeout=30)
        exit_code = stdout.channel.recv_exit_status()
        return exit_code, stdout.read().decode(), stderr.read().decode()


def sftp_upload(local_path: str, remote_path: str) -> None:
    with _connect() as client:
        with client.open_sftp() as sftp:
            # Ensure remote dir exists
            remote_dir = remote_path.rsplit("/", 1)[0]
            try:
                sftp.stat(remote_dir)
            except FileNotFoundError:
                ssh_exec(f"mkdir -p {remote_dir}")
            sftp.put(local_path, remote_path, confirm=True)


def _ok(msg: str) -> list[TextContent]:
    return [TextContent(type="text", text=msg)]


def _err(msg: str) -> list[TextContent]:
    return [TextContent(type="text", text=f"ERROR: {msg}")]


# ---------------------------------------------------------------------------
# Tool implementations
# ---------------------------------------------------------------------------

def tool_get_manifest(app: str) -> list[TextContent]:
    root = REMOTE_ROOTS.get(app)
    if not root:
        return _err(f"Unknown app '{app}'. Valid: {list(REMOTE_ROOTS)}")
    try:
        rc, out, err = ssh_exec(f"cat {root}/version.json 2>/dev/null || echo '__NOT_FOUND__'")
        if "__NOT_FOUND__" in out or not out.strip():
            return _ok(f"version.json not found at {root}/version.json")
        return _ok(out.strip())
    except Exception as e:
        return _err(str(e))


def tool_list_remote_files(app: str) -> list[TextContent]:
    root = REMOTE_ROOTS.get(app)
    if not root:
        return _err(f"Unknown app '{app}'. Valid: {list(REMOTE_ROOTS)}")
    try:
        rc, out, err = ssh_exec(f"ls -lh {root}/ 2>/dev/null || echo '(directory not found)'")
        return _ok(out.strip() or "(empty)")
    except Exception as e:
        return _err(str(e))


def tool_upload_installer(app: str, version: str, local_path: str = "") -> list[TextContent]:
    root = REMOTE_ROOTS.get(app)
    if not root:
        return _err(f"Unknown app '{app}'")
    if not local_path:
        prefix = "CCB-Wanding" if app == "CCB-Wanding" else "CCB-Setup"
        local_path = os.path.join(LOCAL_INSTALLER_DIR, f"{prefix}-{version}.exe")
    if not os.path.exists(local_path):
        return _err(f"Local file not found: {local_path}")
    size_mb = round(os.path.getsize(local_path) / 1024 / 1024, 1)
    remote_filename = os.path.basename(local_path)
    try:
        sftp_upload(local_path, f"{root}/{remote_filename}")
        return _ok(f"Uploaded {remote_filename} ({size_mb} MB) → {root}/{remote_filename}")
    except Exception as e:
        return _err(str(e))


def tool_update_manifest(app: str, manifest: dict) -> list[TextContent]:
    root = REMOTE_ROOTS.get(app)
    if not root:
        return _err(f"Unknown app '{app}'")
    json_str = json.dumps(manifest, ensure_ascii=False, indent=2)
    try:
        ssh_exec(f"mkdir -p {root}")
        with _connect() as client:
            with client.open_sftp() as sftp:
                with sftp.open(f"{root}/version.json", "wb") as f:
                    f.write(json_str.encode("utf-8"))
        return _ok(f"version.json updated at {root}/version.json\n\n{json_str}")
    except Exception as e:
        return _err(str(e))


def tool_deploy_version(
    app: str,
    version: str,
    notes: str,
    date: str,
    size_mb: float | None = None,
    local_path: str = "",
    set_as_latest: bool = True,
) -> list[TextContent]:
    root = REMOTE_ROOTS.get(app)
    http_base = HTTP_BASES.get(app)
    if not root:
        return _err(f"Unknown app '{app}'")

    prefix = "CCB-Wanding" if app == "CCB-Wanding" else "CCB-Setup"
    if not local_path:
        local_path = os.path.join(LOCAL_INSTALLER_DIR, f"{prefix}-{version}.exe")
    if not os.path.exists(local_path):
        return _err(f"Installer not found: {local_path}\nBuild it first.")

    actual_size_mb = size_mb or round(os.path.getsize(local_path) / 1024 / 1024, 1)
    remote_filename = os.path.basename(local_path)
    download_url = f"{http_base}/{remote_filename}"

    lines: list[str] = []
    try:
        # Step 1: Upload exe
        lines.append(f"[1/3] Uploading {remote_filename} ({actual_size_mb} MB)...")
        sftp_upload(local_path, f"{root}/{remote_filename}")
        lines.append("      ✓ Uploaded")

        # Step 2: Fetch current manifest
        lines.append("[2/3] Fetching current version.json...")
        rc, out, _ = ssh_exec(f"cat {root}/version.json 2>/dev/null")
        versions_list: list[dict] = []
        if rc == 0 and out.strip():
            try:
                existing = json.loads(out)
                versions_list = [v for v in existing.get("versions", []) if v.get("version") != version]
            except Exception:
                pass
        lines.append(f"      ✓ {len(versions_list)} existing entries")

        # Step 3: Write new manifest
        lines.append("[3/3] Writing version.json...")
        new_entry: dict[str, Any] = {
            "version": version,
            "url": download_url,
            "notes": notes,
            "date": date,
            "size_mb": actual_size_mb,
        }
        versions_list.insert(0, new_entry)
        manifest: dict[str, Any] = {
            "latest": version if set_as_latest else versions_list[0]["version"],
            "url": download_url,
            "notes": notes,
            "versions": versions_list,
        }
        result = tool_update_manifest(app, manifest)
        if result[0].text.startswith("ERROR"):
            return result
        lines.append("      ✓ Done")
        lines.append("")
        lines.append(f"Deploy complete: {app} {version}")
        lines.append(f"  Download: {download_url}")
        lines.append(f"  Manifest: {http_base}/version.json")
        lines.append("")
        lines.append(json.dumps(manifest, ensure_ascii=False, indent=2))
        return _ok("\n".join(lines))

    except Exception as e:
        return _err(f"{lines[-1] if lines else ''}\n{e}")


# ---------------------------------------------------------------------------
# MCP server
# ---------------------------------------------------------------------------

server = Server("ccb-deploy")

TOOLS = [
    Tool(
        name="deploy_version",
        description="Full deploy: upload installer exe + update version.json. Auto-locates the .exe from the ccb-installer directory.",
        inputSchema={
            "type": "object",
            "properties": {
                "app":           {"type": "string", "description": "CCB-Wanding or CCB"},
                "version":       {"type": "string", "description": "e.g. 1.1.2"},
                "notes":         {"type": "string", "description": "Release notes shown in version selector"},
                "date":          {"type": "string", "description": "Release date YYYY-MM-DD"},
                "size_mb":       {"type": "number", "description": "Override file size in MB (optional, auto-detected)"},
                "local_path":    {"type": "string", "description": "Override local .exe path (optional)"},
                "set_as_latest": {"type": "boolean", "description": "Set as latest version (default true)"},
            },
            "required": ["app", "version", "notes", "date"],
        },
    ),
    Tool(
        name="get_manifest",
        description="Fetch the current version.json from the update server.",
        inputSchema={
            "type": "object",
            "properties": {"app": {"type": "string", "description": "CCB-Wanding or CCB"}},
            "required": ["app"],
        },
    ),
    Tool(
        name="list_remote_files",
        description="List all files in the server update directory for an app.",
        inputSchema={
            "type": "object",
            "properties": {"app": {"type": "string", "description": "CCB-Wanding or CCB"}},
            "required": ["app"],
        },
    ),
    Tool(
        name="upload_installer",
        description="Upload a single .exe to the server without changing version.json.",
        inputSchema={
            "type": "object",
            "properties": {
                "app":        {"type": "string", "description": "CCB-Wanding or CCB"},
                "version":    {"type": "string", "description": "e.g. 1.1.2"},
                "local_path": {"type": "string", "description": "Override local path (optional)"},
            },
            "required": ["app", "version"],
        },
    ),
    Tool(
        name="update_manifest",
        description="Write a new version.json to the server.",
        inputSchema={
            "type": "object",
            "properties": {
                "app":      {"type": "string", "description": "CCB-Wanding or CCB"},
                "manifest": {"type": "object", "description": "Full version.json content"},
            },
            "required": ["app", "manifest"],
        },
    ),
]


@server.list_tools()
async def list_tools() -> list[Tool]:
    return TOOLS


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    try:
        if name == "deploy_version":
            return tool_deploy_version(
                app=arguments["app"],
                version=arguments["version"],
                notes=arguments["notes"],
                date=arguments["date"],
                size_mb=arguments.get("size_mb"),
                local_path=arguments.get("local_path", ""),
                set_as_latest=arguments.get("set_as_latest", True),
            )
        if name == "get_manifest":
            return tool_get_manifest(arguments["app"])
        if name == "list_remote_files":
            return tool_list_remote_files(arguments["app"])
        if name == "upload_installer":
            return tool_upload_installer(
                app=arguments["app"],
                version=arguments["version"],
                local_path=arguments.get("local_path", ""),
            )
        if name == "update_manifest":
            return tool_update_manifest(arguments["app"], arguments["manifest"])
        return _err(f"Unknown tool: {name}")
    except Exception as exc:
        return _err(str(exc))


async def main() -> None:
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
