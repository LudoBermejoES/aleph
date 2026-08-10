#!/usr/bin/env node
// Downloads the semantic-search embedding model into ./models so it can be
// vendored into the deploy artifact (see .github/workflows/deploy.yml) rather
// than downloaded on first production request.
//
// Keep MODEL_ID and env.cacheDir in sync with server/services/embeddings.ts.
import { pipeline, env } from '@huggingface/transformers'
import { join } from 'path'

const MODEL_ID = 'Xenova/multilingual-e5-small'
env.cacheDir = join(process.cwd(), 'models')

console.log(`Downloading ${MODEL_ID} into ${env.cacheDir} ...`)
await pipeline('feature-extraction', MODEL_ID, { dtype: 'q8' })
console.log('Done.')
