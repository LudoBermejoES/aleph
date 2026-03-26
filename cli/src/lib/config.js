import Conf from 'conf'

const store = new Conf({ projectName: 'aleph', configName: 'config' })

export function getConfig() {
  return {
    url: process.env.ALEPH_URL || store.get('url') || null,
    apiKey: process.env.ALEPH_TOKEN || store.get('apiKey') || null,
    apiKeyId: store.get('apiKeyId') || null,
  }
}

export function setConfig(values) {
  if (values.url !== undefined) store.set('url', values.url)
  if (values.apiKey !== undefined) store.set('apiKey', values.apiKey)
  if (values.apiKeyId !== undefined) store.set('apiKeyId', values.apiKeyId)
}

export function clearToken() {
  store.delete('apiKey')
  store.delete('apiKeyId')
  // Also clear legacy token field if present
  store.delete('token')
}

/** Throws a user-friendly error if url or apiKey are missing */
export function requireConfig() {
  const config = getConfig()
  // Detect legacy config with old token field
  if (!config.apiKey && store.get('token')) {
    process.stderr.write(
      'Your stored credentials use the old token format. Please run `aleph login` to re-authenticate with an API key.\n'
    )
    process.exit(1)
  }
  if (!config.url || !config.apiKey) {
    process.stderr.write(
      'Not configured. Run `aleph login` or `aleph config set --url <url>\n'
    )
    process.exit(1)
  }
  return config
}

export function getConfigPath() {
  return store.path
}
