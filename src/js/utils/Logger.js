export class Logger {
    constructor(namespace) {
        this.namespace = namespace;
    }

    generateMessage(message) {
        return `${this.namespace}: ${message}`;
    }

    debug(message) {
        //eslint-disable-next-line no-console
        console.debug(this.generateMessage(message));
    }

    info(message) {
        console.info(this.generateMessage(message));
    }

    notice(message) {
        console.warn(this.generateMessage(message));
    }

    warn(message) {
        console.warn(this.generateMessage(message));
    }

    error(message) {
        console.error(this.generateMessage(message));
    }
}