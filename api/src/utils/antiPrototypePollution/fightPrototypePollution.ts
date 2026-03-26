//Utility functions to deter prototype Pollution
/**
 1. deep (recursive) inspection->Deep detection (block malicious payloads early)
 2. Handle arrays
 3. Guard against “constructor.prototype” chain attack
 4. Sanitize req.body, req.params and req.query ->Safe sanitization (remove prototype chain)
 5. Account for parsed input sources
 */
export function hasDangerousKeysDeep(obj: unknown): boolean {
    if (!obj || typeof obj !== "object") return false;
    const stack = [obj];
    while (stack.length) {
        const current = stack.pop();
        if (!current || typeof current !== "object") continue;
        for (const key of Reflect.ownKeys(current)) {
            if (
                key === "__proto__" ||
                key === "constructor" ||
                key === "prototype"
            ) {
                return true;
            }
            const value = (current as any)[key];
            if (value && typeof value === "object") {
                stack.push(value);
            }
        }
    }
    return false;
}

//safeClone
export function safeClone<T>(input: T): T {
    if (Array.isArray(input)) {
        return input.map(safeClone) as any;
    }
    if (input && typeof input === "object") {
        const clean: any = Object.create(null);
        for (const key of Object.keys(input as any)) {
            if (
                key === "__proto__" ||
                key === "constructor" ||
                key === "prototype"
            ) {
                continue;
            }
            clean[key] = safeClone((input as any)[key]);
        }
        return clean;
    }
    return input;
}