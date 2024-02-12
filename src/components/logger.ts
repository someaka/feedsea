
class Logger {
  enabled;
  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  log(...args: string[]) {
    if (this.enabled) {
      console.log(...args);
    }
  }

  // You can also add wrappers for other console methods if needed
  error(...args: any[]) {
    if (this.enabled) {
      console.error(...args);
    }
  }

  warn(...args: any[]) {
    if (this.enabled) {
      console.warn(...args);
    }
  }

  table(data: any) {
    if (this.enabled) {
      console.table(data);
    }
  }

}


// Export an instance of Logger for each file with logging enabled or disabled
export const serverLogger       = new Logger(true); 
export const clientLogger       = new Logger(false); 
export const feedsLogger        = new Logger(true); 
export const similLogger        = new Logger(true);
export const similWorkerLogger  = new Logger(false);
export const graphLogger        = new Logger(false); 
export const visualGraphLogger  = new Logger(false); 
export const forceAtlasLogger   = new Logger(false); 
export const quadTreeLogger     = new Logger(false); 
export const articlesLogger     = new Logger(true); 

