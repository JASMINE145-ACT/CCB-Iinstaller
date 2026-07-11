# Dev smoke — idle session precipitation (stable path)
# Run from repo root after AionUI + CCB dev sync.

$ErrorActionPreference = "Stop"
$Root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not (Test-Path "$Root\eval\agent_eval_cases.jsonl")) {
    $Root = (Get-Location).Path
}

Write-Host "== precipitation unit tests =="
python "$Root\ccb-installer\config\skills\ccb-session-precipitation\tests\test_precipitation_worker.py"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

python "$Root\ccb-installer\config\skills\ccb-personal-memory\tests\test_personal_memory_stop.py"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

python "$Root\ccb-installer\config\skills\ccb-personal-memory\tests\test_trigger_quality.py"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

python -m pytest "$Root\python\admin\test_org_knowledge_client.py::OrgKnowledgeClientTests::test_rule_already_in_doc_detects_duplicate" -q
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "== optional: LLM mock extract =="
$Mock = Join-Path $env:TEMP "precip-mock-bundle.json"
@'
{
  "skipped": false,
  "lanes": {
    "personal_habits": [{
      "bullet": "报价前先查库存",
      "target": "workflow",
      "evidence": ["我习惯先查库存再报价"],
      "confidence": 0.8
    }]
  }
}
'@ | Set-Content -Encoding utf8 $Mock

$env:CCB_PRECIPITATION_MOCK = $Mock
python "$Root\ccb-installer\config\skills\ccb-session-precipitation\scripts\precipitation_worker.py" `
  --config-dir "$env:LOCALAPPDATA\CCB-Wanding\.claude" `
  --session-id "smoke-session" `
  --conversation-id "smoke-conv" `
  --run-id "smoke-run-$(Get-Date -Format 'yyyyMMddHHmmss')"
Remove-Item Env:CCB_PRECIPITATION_MOCK -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "OK — manual E2E: AionUI ACP turn -> wait 60s -> Memory -> 待沉淀"
Write-Host "Business approve needs org login (ORG_SERVER_URL + org-session.token)"
