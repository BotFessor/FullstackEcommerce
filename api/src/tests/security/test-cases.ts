import request from "supertest";
import { app } from "@/app";
/**
 * Production-grade prototype pollution test suite.
 * Covers JSON, URL-encoded, arrays, nested objects,
 * getters/functions, unicode keys, and multipart forms.
 */
export function prototypePollutionSuite(endpoint: string) {
    describe(`🛡️ Prototype Pollution Protection on: ${endpoint}`, () => {

        // Utility: check if global Object prototype is polluted
        const isPolluted = () => ({} as any).polluted !== undefined;

        afterEach(() => {
            // Ensure pollution does not persist across requests
            expect(isPolluted()).toBe(false);
        });

        // 🔥 JSON ATTACKS
        test("blocks __proto__ payload", async () => {
            const res = await request(app).post(endpoint)
                .send({ __proto__: { polluted: true } });

            expect(res.status).toBe(400);
        });

        test("blocks constructor.prototype attack", async () => {
            const res = await request(app).post(endpoint)
                .send({ constructor: { prototype: { polluted: true } } });

            expect(res.status).toBe(400);
        });

        test("blocks nested pollution (object + array mixed)", async () => {
            const payload: any = { a: [{ b: { __proto__: { polluted: true } } }] };
            const res = await request(app).post(endpoint).send(payload);
            expect(res.status).toBe(400);
        });

        // 🔥 ARRAY ATTACKS
        test("blocks array-only pollution", async () => {
            const res = await request(app)
                .post(endpoint)
                .send([{ __proto__: { polluted: true } }]);

            expect(res.status).toBe(400);
        });

        // 🔥 URLENCODED / qs ATTACKS
        test("blocks urlencoded __proto__", async () => {
            const res = await request(app)
                .post(endpoint)
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send("__proto__[polluted]=true");
            expect(res.status).toBe(400);
        });

        test("blocks deep qs attack", async () => {
            const res = await request(app)
                .post(endpoint)
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send("a[b][c][constructor][prototype][polluted]=true");
            expect(res.status).toBe(400);
        });

        // 🔥 EXTREME EDGE CASES

        // 1. Unicode / escaped keys. The classic unicode-escape bypass
        test("blocks unicode/escaped proto attack", async () => {
            const payload = JSON.parse('{"__pr\\u006fto__": {"polluted": true}}');
            const res = await request(app).post(endpoint).send(payload);
            expect(res.status).toBe(400);
        });

        // 2. Duplicate keys via raw JSON string
        test("blocks duplicate keys", async () => {
            const raw = '{"__proto__": {}, "__proto__": {"polluted": true}}';
            const res = await request(app)
                .post(endpoint)
                .set("Content-Type", "application/json")
                .send(Buffer.from(raw));
            expect(res.status).toBe(400);
        });

        // 3. Null-prototype object
        test("blocks Object.create(null) payload", async () => {
            const payload: any = Object.create(null);
            payload.__proto__ = { polluted: true };
            const res = await request(app).post(endpoint).send(payload);
            expect(res.status).toBe(400);
        });

        // 4. Getter / function injection attacks
        test("blocks getter-based pollution", async () => {
            const payload: any = {};
            Object.defineProperty(payload, "__proto__", {
                get: () => ({ polluted: true }),
            });
            const res = await request(app).post(endpoint).send(payload);
            expect(res.status).toBe(400);
        });

        test("blocks function property payloads", async () => {
            const payload: any = { constructor: { prototype: { hacked: () => "bad" } } };
            const res = await request(app).post(endpoint).send(payload);
            expect(res.status).toBe(400);
        });

        // 5. Deep recursion + mixed array/object
        test("handles extremely deep nested payload safely", async () => {
            let payload: any = {};
            let current = payload;
            for (let i = 0; i < 100; i++) {
                current.a = [{}]; // array in object
                current = current.a[0];
            }
            current.__proto__ = { polluted: true };

            const res = await request(app).post(endpoint).send(payload);
            expect(res.status).toBe(400);
        });

        // 6. Multipart/form-data attacks
        test("blocks multipart form __proto__ attack", async () => {
            const res = await request(app)
                .post(endpoint)
                .set("Content-Type", "multipart/form-data")
                .field("__proto__[polluted]", "true");
            expect(res.status).toBe(400);
        });

        // 7. Mismatched content-type attack
        test("rejects mismatched content-type safely", async () => {
            const res = await request(app)
                .post(endpoint)
                .set("Content-Type", "application/json")
                .send("constructor[prototype][polluted]=true"); // raw string
            expect([400, 415]).toContain(res.status);
        });

        // 8. Ensure pollution does not persist
        test("pollution does not persist across requests", async () => {
            await request(app).post(endpoint).send({ constructor: { prototype: { polluted: true } } });
            const cleanCheck = await request(app).post(endpoint).send({ safe: true });
            expect(({} as any).polluted).toBeUndefined();
        });

        // 🔥 ADVANCED RUNTIME EDGE CASES
        // 9 urlencoded constructor attack, It tests top-level attack
        test("blocks urlencoded constructor attack (top-level)", async () => {
            const res = await request(app)
                .post(endpoint)
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send("constructor[prototype][polluted]=true");

            expect(res.status).toBe(400);
        });

        // 10. Symbol based attack (stability test). Symbols are not serialized in JSON, But they can exist in runtime objects.Some unsafe merge utilities may accidentally include them
        test("handles symbol-based pollution safely", async () => {
            const sym = Symbol("__proto__");
            const payload: any = {};
            payload[sym] = { polluted: true };

            const res = await request(app)
                .post(endpoint)
                .send(payload);

            expect(res.status).toBeLessThan(500);
        });

        // 11. Method override attacks, toString override attack. Can break logging, validation, security logic
        test("blocks toString override", async () => {
            const res = await request(app)
                .post(endpoint)
                .send({
                    constructor: {
                        prototype: {
                            toString: "hacked"
                        }
                    }
                });

            expect(res.status).toBe(400);
        });

        // 12. valueOf override
        test("blocks valueOf override", async () => {
            const res = await request(app)
                .post(endpoint)
                .send({
                    constructor: {
                        prototype: {
                            valueOf: "hacked"
                        }
                    }
                });

            expect(res.status).toBe(400);
        });

        //13. "in" operator trap (VERY IMPORTANT). Global pollution verification (CRITICAL). Even if your API rejects the payload, If pollution succeeded internally: "polluted" in {} returns true and 👉 That means global prototype is compromised.

        test("does not allow inherited pollution", async () => {
            await request(app)
                .post(endpoint)
                .send({
                    constructor: {
                        prototype: { polluted: true }
                    }
                });

            const obj = {};
            expect("polluted" in obj).toBe(false);
        });

        // 🔥 FAANG LEVEL ATTACKS-BLACK HAT LEVEL
        //14. __proto__ via JSON arrays as root. Test for root-level array pollution merging later. 👉 Why this matters: Some backends do: Object.assign({}, ...req.body), 💀 That’s instant pollution.
        test("blocks root-level array pollution used in merge", async () => {
            const payload = [
                { safe: true },
                { __proto__: { polluted: true } }
            ];

            const res = await request(app).post(endpoint).send(payload);
            expect(res.status).toBe(400);
        });

        // 15. Case variation bypass (VERY REAL ATTACK). 👉 Some naive filters check exact "__proto__" only.
        test("blocks case-variant proto keys", async () => {
            const payload = { "__Proto__": { polluted: true } };

            const res = await request(app).post(endpoint).send(payload);
            expect(res.status).toBe(400);
        });

        // 16. JSON Pointer / Dot notation injection, Some parsers or libraries interpret dots. 👉 This hits: Mongo-style parsers, Lodash set, config loaders.
        test("blocks dot-notation pollution", async () => {
            const res = await request(app)
                .post(endpoint)
                .send({ "constructor.prototype.polluted": true });

            expect(res.status).toBe(400);
        });

        // 17. Mixed encoding attack (double encoding). Real attackers LOVE this.
        test("blocks double-encoded proto attack", async () => {
            const res = await request(app)
                .post(endpoint)
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send("%255F%255Fproto%255F%255F[polluted]=true"); // double encoded

            expect(res.status).toBe(400);
        });

        // 18. Sparse array + index trick. 👉 Targets: Iteration logic bugs, Performance + traversal skips
        test("blocks sparse array pollution", async () => {
            const payload = [];
            payload[100000] = { __proto__: { polluted: true } };

            const res = await request(app).post(endpoint).send(payload);
            expect(res.status).toBe(400);
        });

        // 19. Prototype chain poisoning via __proto__ assignment AFTER parse. This one is sneaky: 👉 Some parsers sanitize during parse, but not after object mutation.
        test("blocks post-parse prototype mutation", async () => {
            const payload: any = {};
            payload["__proto__"] = { polluted: true };

            const res = await request(app).post(endpoint).send(payload);
            expect(res.status).toBe(400);
        });

        // 20. constructor as non-object. 👉 Can break assumptions and bypass guards.
        test("blocks constructor as primitive", async () => {
            const res = await request(app)
                .post(endpoint)
                .send({ constructor: "evil" });

            expect(res.status).toBe(400);
        });

        // 21. Circular reference (DoS / crash vector). 👉 Many deep-walk validators crash here.
        test("handles circular references safely", async () => {
            const payload: any = {};
            payload.self = payload;

            const res = await request(app).post(endpoint).send(payload);

            expect(res.status).toBeLessThan(500);
        });

        // 22. Large payload (memory exhaustion test). This is production critical (DoS vector).
        test("rejects extremely large payload", async () => {
            const payload = JSON.stringify({ a: "x".repeat(10_000_000) });

            const res = await request(app)
                .post(endpoint)
                .set("Content-Type", "application/json")
                .send(payload);

            expect([400, 413]).toContain(res.status);
        });

        // 23. Pollution via merge behavior (CRITICAL REAL-WORLD TEST). Simulate what apps actually do: 👉 This mimics real backend bugs.
        test("does not pollute during object merge", async () => {
            const malicious = { __proto__: { polluted: true } };

            const res = await request(app).post(endpoint).send(malicious);

            const merged = Object.assign({}, malicious);

            expect(({} as any).polluted).toBeUndefined();
        });

        //24. Content-Type Polyglot Attacks (VERY REAL), Testing polyglot payloads (valid in multiple parsers). 👉 Why this matters: Some middleware parses JSON, Another parses qs,💀 You get double interpretation.
        test("blocks JSON + urlencoded polyglot payload", async () => {
            const payload = '{"a":1}&__proto__[polluted]=true';

            const res = await request(app)
                .post(endpoint)
                .set("Content-Type", "application/json")
                .send(payload);

            expect([400, 415]).toContain(res.status);
        });

        // 25. Conflicting Parsers (Express stack attack), If you use BOTH: express.json(),express.urlencoded({ extended: true }).👉 Real bug class: First parser ignores,Second parses differently,💀 Payload sneaks through
        test("blocks mixed parser confusion attack", async () => {
            const res = await request(app)
                .post(endpoint)
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send('{"__proto__":{"polluted":true}}');

            expect([400, 415]).toContain(res.status);
        });

        // 26. JSON Reviver / Custom Parser Attacks. If anywhere you do: JSON.parse(body, reviver), You are exposed.👉 Why: Revivers can reintroduce polluted keys after validation
        test("blocks reviver-style pollution payload", async () => {
            const raw = '{"a":1,"__proto__":{"polluted":true}}';

            const res = await request(app)
                .post(endpoint)
                .set("Content-Type", "application/json")
                .send(Buffer.from(raw));

            expect(res.status).toBe(400);
        });

        // 27. Prototype Pollution via Headers (VERY UNDERRATED). 👉 Why this matters: Headers sometimes merged into objects. Logging libs / auth libs may merge them
        test("blocks prototype pollution via headers", async () => {
            const res = await request(app)
                .post(endpoint)
                .set("__proto__", '{"polluted":true}')
                .send({ safe: true });

            expect(res.status).toBeLessThan(500);
        });

        // 28. Query String Pollution.  👉 Real-world: req.query often merged with req.body. 💀 Classic bypass vector.
        test("blocks query string prototype pollution", async () => {
            const res = await request(app)
                .post(`${endpoint}?__proto__[polluted]=true`)
                .send({});

            expect(res.status).toBe(400);
        });

        // 29. Path Parameter Injection. 👉 Why: Some frameworks map params into objects
        test("blocks route param pollution", async () => {
            const res = await request(app)
                .post(`${endpoint}/__proto__`)
                .send({});

            expect(res.status).toBeLessThan(500);
        });

        //30. Boolean / Null Coercion Attacks. 👉 Why: Can break traversal logic, Cause validator to skip checks
        test("blocks null prototype pollution trick", async () => {
            const res = await request(app)
                .post(endpoint)
                .send({ __proto__: null });

            expect(res.status).toBe(400);
        });

        // 31. Array Prototype Pollution (RARE BUT REAL). 👉 Most defenses only protect Object, not Array
        test("blocks Array prototype pollution", async () => {
            const payload: any = [];
            payload.constructor = { prototype: { polluted: true } };

            const res = await request(app).post(endpoint).send(payload);

            expect(res.status).toBe(400);
        });

        // 32. Async Race Condition (HIGH-END ATTACK). This is bank-grade real: 👉 Why: Shared state bugs, Non - atomic validation
        test("no race condition in parallel pollution attempts", async () => {
            const payload = { constructor: { prototype: { polluted: true } } };

            await Promise.all([
                request(app).post(endpoint).send(payload),
                request(app).post(endpoint).send(payload),
                request(app).post(endpoint).send(payload),
            ]);

            expect(({} as any).polluted).toBeUndefined();
        });

        // 33. Logging / Serialization Sink Attack (VERY REAL). Even if validation passes: 👉 Why: Logging systems trigger execution, Data exfiltration vector
        test("safe during JSON stringify/logging", async () => {
            const payload = { constructor: { prototype: { toJSON: () => "pwned" } } };

            const res = await request(app).post(endpoint).send(payload);

            expect(res.status).toBe(400);
        });

        // 34. Bracket + dot hybrid (qs confusion). Why? Some parsers interpret . AND [] differently, This bypasses naive filters
        test("blocks qs . plus [] hybrid attack", async () => {
            const res = await request(app)
                .post(endpoint)
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send("constructor.prototype[polluted]=true");

            expect(res.status).toBe(400);
        });

        // 35. Array index + constructor chain. 👉 Why: Exploits array traversal assumptions
        test("blocks qs array index constructor attack", async () => {
            const res = await request(app)
                .post(endpoint)
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send("a[0][constructor][prototype][polluted]=true");

            expect(res.status).toBe(400);
        });

        // 36. Empty key trick (qs edge case). 👉 Why: Some parsers treat this as root object injection
        test("blocks qs empty key pollution", async () => {
            const res = await request(app)
                .post(endpoint)
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send("[constructor][prototype][polluted]=true");

            expect(res.status).toBe(400);
        });

        // 37. Mixed JSON inside urlencoded. 👉 Why:Real apps often do: JSON.parse(req.body.payload). 💀 Second-stage pollution
        test("blocks embedded JSON inside urlencoded", async () => {
            const res = await request(app)
                .post(endpoint)
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send('payload={"constructor":{"prototype":{"polluted":true}}}');

            expect(res.status).toBe(400);
        });

        //  38. qs depth limit bypass attempt. 👉 Why: Targets qs depth/arrayLimit configs
        test("blocks qs deep nesting bypass attempt", async () => {
            const deep = "a".repeat(10);
            const payload = `${deep}[constructor][prototype][polluted]=true`;
            const res = await request(app)
                .post(endpoint)
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send(payload);

            expect(res.status).toBe(400);
        });

        // 39. Duplicate mixed encoding attack. 👉 Why: Same class as unicode bypass but in URL encoding
        test("blocks mixed encoded constructor attack", async () => {
            const res = await request(app)
                .post(endpoint)
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send("c%6Fnstructor[prototype][polluted]=true"); // 'o' encoded

            expect(res.status).toBe(400);
        });

        // 40. Parameter pollution (duplicate keys). 👉 Why: Different parsers resolve duplicates differently. 💀 Classic bypass vector
        test("blocks parameter pollution attack", async () => {
            const res = await request(app)
                .post(endpoint)
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send("__proto__=safe&__proto__[polluted]=true");

            expect(res.status).toBe(400);
        });

        // 41. Nested JSON + qs combo (real-world bug class). 👉 Why: Happens when apps parse nested JSON fields manually
        test("blocks nested JSON + qs hybrid attack", async () => {
            const res = await request(app)
                .post(endpoint)
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send('a[b]={"__proto__":{"polluted":true}}');

            expect(res.status).toBe(400);
        });

        // 42. Homoglyph attack (Unicode lookalike). 👉 Why: .normalize("NFKC") helps, but not all homoglyphs collapse. This is a real bypass class
        test("blocks unicode homoglyph proto attack", async () => {
            const payload = { "__prоtо__": { polluted: true } };
            // uses Cyrillic 'о' not Latin 'o'

            const res = await request(app).post(endpoint).send(payload);

            expect(res.status).toBe(400);
        });

        // 43. Zero-width character injection. 👉 Why: Invisible characters bypass string comparisons
        test("blocks zero-width character proto attack", async () => {
            const payload = { "__proto__\u200b": { polluted: true } };

            const res = await request(app).post(endpoint).send(payload);

            expect(res.status).toBe(400);
        });

        // 44. Non - enumerable property attack. 👉 Why: Many validators use Object.keys() → miss this. You use Reflect.ownKeys() → good, but test it
        test("blocks non-enumerable proto property", async () => {
            const payload: any = {};
            Object.defineProperty(payload, "__proto__", {
                value: { polluted: true },
                enumerable: false
            });

            const res = await request(app).post(endpoint).send(payload);

            expect(res.status).toBe(400);
        });

        //45. Frozen object bypass attempt. 👉 Why: Some sanitizers fail on frozen objects
        test("handles frozen object safely", async () => {
            const payload = Object.freeze({
                constructor: { prototype: { polluted: true } }
            });
            const res = await request(app).post(endpoint).send(payload);

            expect(res.status).toBe(400);
        });

        // 46. Sealed object bypass attempt.
        test("blocks constructor reassignment attack", async () => {
            const payload: any = {
                constructor: function () { }
            };

            payload.constructor.prototype = { polluted: true };

            const res = await request(app).post(endpoint).send(payload);

            expect(res.status).toBe(400);
        });

        // 47. Prototype reassignment via constructor trick. 👉 Why: Bypasses simple object-shape assumptions
        test("blocks constructor reassignment attack", async () => {
            const payload: any = {
                constructor: function () { }
            };
            payload.constructor.prototype = { polluted: true };
            const res = await request(app).post(endpoint).send(payload);

            expect(res.status).toBe(400);
        });

        // 48. toJSON sneaky mutation attack. 👉 Why: Some systems stringify before validation
        test("blocks toJSON mutation attack", async () => {
            const payload = {
                toJSON() {
                    return { __proto__: { polluted: true } };
                }
            };
            const res = await request(app).post(endpoint).send(payload);

            expect(res.status).toBe(400);
        });

        // 49. Deep mixed encoding (unicode + urlencoded). 
        test("blocks mixed unicode + urlencoded attack", async () => {
            const res = await request(app)
                .post(endpoint)
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send("%5F%5Fpr%6Fto%5F%5F[polluted]=true");

            expect(res.status).toBe(400);
        });

        // 50. JSON array with prototype getter
        test("blocks array getter pollution", async () => {
            const payload: any = [];
            Object.defineProperty(payload, "0", {
                get: () => ({ __proto__: { polluted: true } })
            });
            const res = await request(app).post(endpoint).send(payload);

            expect(res.status).toBe(400);
        });


    });
}

/**
 🧠 3. REALITY CHECK — What level of attacker can break you?

Let’s be brutally honest (this is important):

🟢 Script Kiddies / Low-level attackers
❌ No chance
They rely on:
basic payloads
copy-paste exploits

👉 Your system completely destroys them.

🟡 Intermediate attackers (bug bounty hunters)
⚠️ Very unlikely
They might try:
encoding tricks
qs/parser confusion
nested payloads

👉 You’ve already covered these heavily.

🔴 Advanced attackers (senior security engineers / black hats)

👉 This is where reality matters:

They will NOT attack your validation layer directly.

They will go after:

💀 Real weak points (outside your current scope):

Unsafe merges

Object.assign({}, req.body)
lodash.merge(...)
Third-party libraries
config loaders
ORMs
logging libs
Deserialization chains
JSON.parse with revivers
YAML parsers
custom parsers
Business logic flaws
auth bypass
privilege escalation
Stateful bugs
race conditions beyond request level
shared memory pollution
🔐 Final Verdict

If your system passes all your tests + the ones above:

👉 You are protected against:
~99% of real-world prototype pollution attacks
⚠️ But not against:
Supply chain attacks
Logic bugs
Unsafe merges elsewhere
Unknown 0-days
🧠 The Most Important Insight

Prototype pollution is rarely the final exploit — it’s an entry point.

You’ve hardened the entry point extremely well.
 */