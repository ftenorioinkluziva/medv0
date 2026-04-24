type LogMeta = unknown

function write(level: 'info' | 'warn' | 'error', message: string, meta?: LogMeta) {
  if (meta === undefined) {
    if (level === 'info') console.info(message)
    if (level === 'warn') console.warn(message)
    if (level === 'error') console.error(message)
    return
  }

  if (level === 'info') console.info(message, meta)
  if (level === 'warn') console.warn(message, meta)
  if (level === 'error') console.error(message, meta)
}

export const logger = {
  info: (message: string, meta?: LogMeta) => write('info', message, meta),
  warn: (message: string, meta?: LogMeta) => write('warn', message, meta),
  error: (message: string, meta?: LogMeta) => write('error', message, meta),
}
