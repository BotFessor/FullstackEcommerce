import pino from "pino";

export const logger = pino({
    level: "info",
    transport: {
        targets: [
            {
                target: "pino-pretty",
                level: "info",
                options: { colorize: true }
            },
            {
                target: "./pinoNeonTransport.ts",
                level: "warn"
            }
        ]
    }
});