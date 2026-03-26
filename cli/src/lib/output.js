import chalk from 'chalk'

/**
 * Print data to stdout.
 * - With --json: raw JSON, no decoration
 * - Without --json: human-readable with chalk colors
 */
export function print(data, { json = false, label } = {}) {
  if (json) {
    process.stdout.write(JSON.stringify(data, null, 2) + '\n')
    return
  }
  if (label) {
    console.log(chalk.bold.cyan(label))
  }
  if (Array.isArray(data)) {
    printTable(data)
  } else if (data && typeof data === 'object') {
    printObject(data)
  } else {
    console.log(data)
  }
}

export function success(message) {
  console.log(chalk.green('✓') + ' ' + message)
}

export function warn(message) {
  console.log(chalk.yellow('⚠') + ' ' + message)
}

export function info(message) {
  console.log(chalk.dim(message))
}

function printTable(rows) {
  if (!rows.length) {
    console.log(chalk.dim('(no results)'))
    return
  }
  const keys = Object.keys(rows[0])
  // Compute column widths
  const widths = keys.map(k =>
    Math.max(k.length, ...rows.map(r => String(r[k] ?? '').length))
  )
  // Header
  const header = keys.map((k, i) => chalk.bold(k.padEnd(widths[i]))).join('  ')
  console.log(header)
  console.log(keys.map((_, i) => '─'.repeat(widths[i])).join('  '))
  // Rows
  for (const row of rows) {
    const line = keys.map((k, i) => String(row[k] ?? '').padEnd(widths[i])).join('  ')
    console.log(line)
  }
}

function printObject(obj) {
  const maxKey = Math.max(...Object.keys(obj).map(k => k.length))
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue
    const val = typeof v === 'object' ? JSON.stringify(v) : String(v)
    console.log(chalk.bold(k.padEnd(maxKey)) + '  ' + val)
  }
}
