// src/tests/security/js_runtime-attacks.test.ts

import { hasDangerousKeysDeep } from "@/utils/security/antiPrototypePollution/ppGuard";

describe("🧠 JS Runtime Prototype Pollution Attacks", () => {

    test("detects duplicate keys", () => {
        const raw = '{"__proto__": {}, "__proto__": {"polluted": true}}';
        const parsed = JSON.parse(raw);

        expect(hasDangerousKeysDeep(parsed)).toBe(true);
    });

    test("detects Object.create(null)", () => {
        const payload: any = Object.create(null);
        payload.__proto__ = { polluted: true };

        expect(hasDangerousKeysDeep(payload)).toBe(true);
    });

    test("detects getter attack", () => {
        const payload: any = {};

        Object.defineProperty(payload, "__proto__", {
            get: () => ({ polluted: true }),
        });

        expect(hasDangerousKeysDeep(payload)).toBe(true);
    });

    test("detects non-enumerable", () => {
        const payload: any = {};

        Object.defineProperty(payload, "__proto__", {
            value: { polluted: true },
            enumerable: false,
        });

        expect(hasDangerousKeysDeep(payload)).toBe(true);
    });

    test("detects toJSON attack", () => {
        const payload = {
            toJSON() {
                return { __proto__: { polluted: true } };
            }
        };

        expect(hasDangerousKeysDeep(payload)).toBe(true);
    });

    test("detects array getter pollution", () => {
        const payload: any = [];

        Object.defineProperty(payload, "0", {
            get: () => ({ __proto__: { polluted: true } }),
        });

        expect(hasDangerousKeysDeep(payload)).toBe(true);
    });

});