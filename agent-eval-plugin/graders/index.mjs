import { gradeEvidenceLink } from './evidence-link.mjs'
import { gradeSequence } from './sequence.mjs'
import { gradeStructuredOutput } from './structured-output.mjs'
import { gradeToolArgs } from './tool-args.mjs'
import { gradeToolForbidden } from './tool-forbidden.mjs'
import { gradeToolPresence } from './tool-presence.mjs'

const registry = {
  evidence_link: gradeEvidenceLink,
  sequence: gradeSequence,
  structured_output: gradeStructuredOutput,
  tool_args: gradeToolArgs,
  tool_forbidden: gradeToolForbidden,
  tool_presence: gradeToolPresence,
}

export function gradeCase(caseDefinition, events) {
  return caseDefinition.graders.map((grader) => {
    const implementation = registry[grader.type]
    if (!implementation) throw new Error(`Unsupported grader type: ${grader.type}`)
    return implementation(grader, events)
  })
}
