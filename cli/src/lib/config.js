import Conf from 'conf'

const store = new Conf({ projectName: 'aleph', configName: 'config' })

export function getConfig() {
  return {
    url: process.env.ALEPH_URL || store.get('url') || null,
    token: process.env.ALEPH_TOKEN || store.get('token') || null,
  }
}

export function setConfig(values) {
  if (values.url !== undefined) store.set('url', values.url)
  if (values.token !== undefined) store.set('token', values.token)
}

export function clearToken() {
  store.delete('token')
}

/** Throws a user-friendly error if url or token are missing */
export function requireConfig() {
  const config = getConfig()
  if (!config.url || !config.token) {
    process.stderr.write(
      'Not configured. Run `aleph login` or `aleph config set --url <url> --token <token>`\n'
    )
    process.exit(1)
  }
  return config
}

export function getConfigPath() {
  return store.path
}
