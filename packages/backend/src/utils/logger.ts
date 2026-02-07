type LogLevel = 'INFO' | 'ERROR' | 'WARN';

function formatMessage(level: LogLevel, context: string, message: string, data?: any): string {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level}] [${context}] ${message}`;
  return data ? `${base} ${JSON.stringify(data)}` : base;
}

export const logger = {
  info(context: string, message: string, data?: any) {
    console.log(formatMessage('INFO', context, message, data));
  },

  error(context: string, message: string, error?: any) {
    const errorData = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error;
    console.error(formatMessage('ERROR', context, message, errorData));
  },

  warn(context: string, message: string, data?: any) {
    console.warn(formatMessage('WARN', context, message, data));
  },
};
