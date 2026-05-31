async function e(e,t){if(t?.list){console.log(`Recent versions:`),console.log(`  (version listing requires access to the release registry)`),console.log("  Use `claude update --list` for available versions.");return}if(t?.safe){if(console.log(`Safe rollback: would install the server-pinned safe version.`),t.dryRun){console.log(`  (dry run — no changes made)`);return}console.log(`  Safe version pinning requires access to the release API.`),console.log(`  Contact oncall for the current safe version.`);return}if(!e){console.error(`Usage: claude rollback [target]

Options:
  -l, --list     List recent published versions
  --dry-run      Show what would be installed
  --safe         Roll back to server-pinned safe version

Examples:
  claude rollback 2.1.880
  claude rollback --list
  claude rollback --safe`),process.exitCode=1;return}if(console.log(`Rolling back to version ${e}...`),t?.dryRun){console.log(`  (dry run — would install ${e})`);return}let{spawnSync:n}=await import(`child_process`),r=n(`npm`,[`install`,`-g`,`@anthropic-ai/claude-code@${e}`],{stdio:`inherit`});r.status===0?console.log(`Rolled back to ${e} successfully.`):(console.error(`Rollback failed with exit code ${r.status}`),process.exitCode=r.status??1)}export{e as rollback};