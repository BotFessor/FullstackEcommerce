//UTILITY FUNCTIONS TO DETER PROTOTYPE POLLUTION
/**=====================================
 * HASDANGEROUSKEYSDEEP()
 * 1. deep (recursive) inspection->Deep detection (block malicious payloads early)
 * 2. Handle arrays
 * 3. Guard against “constructor.prototype” chain attack
 * 4. Sanitize req.body, req.params and req.query ->Safe sanitization (remove prototype chain)
 * 5. Account for parsed input sources
 * ======================================
 */
export function hasDangerousKeysDeep(obj: unknown): boolean {
    if (!obj || typeof obj !== "object") return false;

    const MAX_KEYS = 200;          // key explosion guard
    const MAX_ARRAY_LENGTH = 10000; // large array DoS guard
    const MAX_DEPTH = 50;          // optional, prevent deep nesting DoS

    const visited = new WeakSet<any>(); // Prevent revisiting objects/arrays

    function exceedsKeyCount(obj: any): boolean {
        if (!obj || typeof obj !== "object") return false;
        return Reflect.ownKeys(obj).length > MAX_KEYS;
    }

    const stack: Array<{ node: any; depth: number }> = [{ node: obj, depth: 0 }];

    while (stack.length) {
        const { node: current, depth } = stack.pop()!;
        if (!current || typeof current !== "object") continue;

        // ✅ Prevent infinite loops / repeated traversal
        if (visited.has(current)) continue;
        visited.add(current);

        // ✅ Optional depth guard
        if (depth > MAX_DEPTH) return true; //Excessive depth

        // ✅ DoS guard for huge arrays
        if (Array.isArray(current) && current.length > MAX_ARRAY_LENGTH) {
            return true; // potential DoS payload
        }

        // ✅ Handle arrays first (sparse-safe)
        if (Array.isArray(current)) {
            for (let i = 0; i < current.length; i++) {
                if (i in current) {
                    const item = current[i];
                    if (item && typeof item === "object") {
                        stack.push({ node: item, depth: depth + 1 });
                    }
                }
            }
            continue; // skip key scanning for arrays
        }

        // ✅ Key explosion detection
        if (exceedsKeyCount(current)) return true;

        // ✅ Handle objects
        for (const key of Reflect.ownKeys(current)) {
            // 🔥 STEP 1: safely get descriptor FIRST
            const descriptor = Object.getOwnPropertyDescriptor(current, key);

            if (!descriptor) continue;
            // 🔥 STEP 2: BLOCK getters/setters BEFORE anything else
            if (descriptor.get || descriptor.set) {
                // add Pino Logging: getter/setter detected (advanced attack)
                return true;
            }
            // 🔥 STEP 3: now it's safe to process key
            // ⚠ Skip symbols (cannot normalize)
            if (typeof key === "string") {
                const normalized = key
                    .toString()
                    .normalize("NFKC") // protect against Unicode homoglyphs
                    .toLowerCase()
                    .trim();

                // 🔥 Direct dangerous keys
                if (
                    normalized === "__proto__" ||
                    normalized === "constructor" ||
                    normalized === "prototype"
                ) {
                    return true;
                }

                // 🔥 Dot-notation / path attacks
                if (
                    normalized.split(".").some(segment =>
                        segment === "__proto__" ||
                        segment === "constructor" ||
                        segment === "prototype"
                    )
                ) {
                    return true;
                }
            }
            // 🔥 Only traverse safe values (avoid getters)
            const desc = Object.getOwnPropertyDescriptor(current, key);
            if (!desc) continue;
            if ("value" in desc) {
                const value = desc.value;
                if (value && typeof value === "object") {
                    stack.push({ node: value, depth: depth + 1 });
                }
            }
        }
    }

    return false;
}
/**
 * 🔹 Safe deep clone with Unicode normalization
 * Prevents prototype pollution, circular refs, and Unicode homoglyphs in keys
 */
export function safeClone<T>(input: T, seen = new WeakMap()): T {
    if (input === null || typeof input !== "object") return input;
    if (seen.has(input as any)) return seen.get(input as any);
    if (Array.isArray(input)) {
        const arr: any[] = [];
        seen.set(input, arr);
        for (const item of input) arr.push(safeClone(item, seen));
        return arr as any;
    }

    const clean = Object.create(null);
    seen.set(input as any, clean);
    for (const key of Reflect.ownKeys(input as any)) {
        if (
            typeof key === "string" &&
            (key === "__proto__" || key === "constructor" || key === "prototype")
        ) continue;
        // 🔹 Unicode safe key
        const safeKey = typeof key === "string" ? key.normalize("NFKC") : key;
        const desc = Object.getOwnPropertyDescriptor(input as any, key);
        if (!desc || !("value" in desc)) continue;

        clean[safeKey] = safeClone(desc.value, seen);
    }
    return clean;
}

/**
 * ==========================
 * SAFE PLAIN OBJECT
 * The problem is: req.query is not a normal object — it’s parsed by Express (often via qs) and can contain: nested structures from a[b][c], arrays, prototype-linked objects, weird encodings, so treat req.query as hostile input and sanitize BEFORE scanning
 * Even if your detection is strong, this can still happen: 
    req.query.__proto__ 👉  may already be polluted or linked
    OR
    ?constructor[prototype][polluted]=true 👉 The parser may already shape the object in dangerous ways.

 * ✅ Bank-Grade Fix Strategy: You need 2 layers for req.query:
    ✅ 1. Break prototype chain (CRITICAL)-Convert query into a null-prototype object
    ✅ 2. Then run your deep detection
    Guard against attackers using Getters + Object.defineProperty
 * ==========================
 */
export function safePlainObject(input: any, seen = new WeakMap()): any {
    if (input === null || typeof input !== "object") return input;
    if (seen.has(input)) return seen.get(input);
    if (Array.isArray(input)) {
        const arr: any[] = [];
        seen.set(input, arr);
        for (let i = 0; i < input.length; i++) {
            if (i in input) {
                const desc = Object.getOwnPropertyDescriptor(input, i);
                if (!desc || !("value" in desc)) continue;
                arr.push(safePlainObject(desc.value, seen));
            }
        }
        return arr;
    }
    const obj = Object.create(null);
    seen.set(input, obj);

    for (const key of Reflect.ownKeys(input)) {
        const desc = Object.getOwnPropertyDescriptor(input, key);

        // 🔥 CRITICAL: skip getters/setters
        if (!desc || !("value" in desc)) continue;
        const safeKey =
            typeof key === "string"
                ? key.normalize("NFKC")
                : key;

        obj[safeKey] = safePlainObject(desc.value, seen);
    }
    return obj;
}

export function hasRawDangerousPatterns(input: unknown): boolean {
    if (typeof input !== "string") return false;

    const normalized = input
        .normalize("NFKC")
        .toLowerCase();

    const patterns = [
        "__proto__",
        "constructor",
        "prototype",
    ];

    return patterns.some(p => normalized.includes(p));
}
//“Empty object = suspicious in this context”
export function hasSuspiciousEmptyStructures(input: unknown): boolean {
    if (!input || typeof input !== "object") return false;

    const stack = [input];

    while (stack.length) {
        const current = stack.pop();

        if (!current || typeof current !== "object") continue;

        // 🚨 suspicious empty object
        if (
            !Array.isArray(current) &&
            Object.keys(current).length === 0
        ) {
            return true;
        }

        if (Array.isArray(current)) {
            for (const item of current) {
                if (item && typeof item === "object") {
                    stack.push(item);
                }
            }
        } else {
            for (const key of Object.keys(current)) {
                const val = (current as any)[key];
                if (val && typeof val === "object") {
                    stack.push(val);
                }
            }
        }
    }

    return false;
}




