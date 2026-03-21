export class Logger {
  private namespace: string;

  constructor(namespace: string) {
    this.namespace = namespace;
  }

  private format(message: string) {
    return `${this.namespace}: ${message}`;
  }

  info(message: string) {
    console.info(this.format(message));
  }

  warn(message: string) {
    console.warn(this.format(message));
  }

  error(message: string) {
    console.error(this.format(message));
  }
}

