import type { ContentBlock } from '@agentclientprotocol/sdk'



export type AnthropicTextBlock = {

  type: 'text'

  text: string

}



export type AnthropicImageBlock = {

  type: 'image'

  source:

    | {

        type: 'base64'

        data: string

        media_type: string

      }

    | {

        type: 'url'

        url: string

      }

}



export type AnthropicContentBlock = AnthropicTextBlock | AnthropicImageBlock



/** String for text-only prompts; content blocks when images are present. */

export type PromptSubmitInput = string | AnthropicContentBlock[]



export function promptToSubmitInput(

  prompt: Array<ContentBlock> | undefined,

): PromptSubmitInput {

  if (!prompt || prompt.length === 0) return ''



  const textParts: string[] = []

  const contextParts: string[] = []

  const imageBlocks: AnthropicImageBlock[] = []



  for (const block of prompt) {

    const b = block as Record<string, unknown>

    if (b.type === 'text') {

      const text = String(b.text ?? '')

      if (text.length > 0) textParts.push(text)

    } else if (b.type === 'image') {

      const imageBlock = imageBlockFromAcpChunk(b)

      if (imageBlock) imageBlocks.push(imageBlock)

    } else if (b.type === 'resource_link') {

      const name = typeof b.name === 'string' ? b.name : undefined

      const uri = typeof b.uri === 'string' ? b.uri : undefined

      textParts.push(formatResourceLink(name, uri))

    } else if (b.type === 'resource') {

      const resource = b.resource as Record<string, unknown> | undefined

      if (resource && typeof resource.text === 'string') {

        const uri = typeof resource.uri === 'string' ? resource.uri : ''

        if (uri.length > 0) {

          textParts.push(formatUriAsLink(uri))

          contextParts.push(

            `\n<context ref="${uri}">\n${resource.text}\n</context>`,

          )

        } else {

          textParts.push(resource.text)

        }

      }

    }

  }



  const textPayload = [...textParts, ...contextParts].join('\n')



  if (imageBlocks.length === 0) {

    return textPayload

  }



  const blocks: AnthropicContentBlock[] = []

  if (textPayload.length > 0) {

    blocks.push({ type: 'text', text: textPayload })

  }

  blocks.push(...imageBlocks)

  return blocks

}



function imageBlockFromAcpChunk(

  chunk: Record<string, unknown>,

): AnthropicImageBlock | undefined {

  const data = typeof chunk.data === 'string' ? chunk.data : ''

  if (data.length > 0) {

    const mimeType =

      typeof chunk.mimeType === 'string'

        ? chunk.mimeType

        : typeof chunk.mime_type === 'string'

          ? chunk.mime_type

          : 'image/png'

    return {

      type: 'image',

      source: { type: 'base64', data, media_type: mimeType },

    }

  }



  const uri = typeof chunk.uri === 'string' ? chunk.uri : ''

  if (uri.startsWith('http')) {

    return {

      type: 'image',

      source: { type: 'url', url: uri },

    }

  }



  return undefined

}



export function isEmptyPromptSubmitInput(input: PromptSubmitInput): boolean {

  if (typeof input === 'string') return input.trim().length === 0

  return input.length === 0

}



/** @deprecated Prefer promptToSubmitInput — drops images when used alone. */

export function promptToQueryInput(

  prompt: Array<ContentBlock> | undefined,

): string {

  const input = promptToSubmitInput(prompt)

  if (typeof input === 'string') return input

  return input

    .filter((block): block is AnthropicTextBlock => block.type === 'text')

    .map(block => block.text)

    .join('\n')

}



function formatUriAsLink(uri: string): string {

  try {

    if (uri.startsWith('file://')) {

      const path = uri.slice(7)

      const name = path.split('/').pop() || path

      return `[@${name}](${uri})`

    }

    if (uri.startsWith('zed://')) {

      const parts = uri.split('/')

      const name = parts[parts.length - 1] || uri

      return `[@${name}](${uri})`

    }

    return uri

  } catch {

    return uri

  }

}



function formatResourceLink(

  name: string | undefined,

  uri: string | undefined,

): string {

  const details: string[] = []

  if (name && name.length > 0) details.push(`name=${name}`)

  if (uri && uri.length > 0) details.push(`uri=${uri}`)

  return details.length > 0

    ? `Resource link: ${details.join(', ')}`

    : 'Resource link'

}


