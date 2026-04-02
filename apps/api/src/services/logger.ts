export const logger = {
  info: (msg: string) => console.info(`[INFO] ${new Date().toISOString()}: ${msg}`),
  error: (msg: string, err?: any) => console.error(`[ERROR] ${new Date().toISOString()}: ${msg}`, err),
  warn: (msg: string) => console.warn(`[WARN] ${new Date().toISOString()}: ${msg}`),
};
