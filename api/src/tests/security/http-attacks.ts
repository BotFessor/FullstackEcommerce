// src/tests/security/http-attacks.test.ts

import request from "supertest";
import { app } from "@/app";

export function httpAttacksSuite(endpoint: string) {
    describe(`🌐 HTTP Prototype Pollution Attacks: ${endpoint}`, () => {

        test("blocks __proto__ payload", async () => {
            const res = await request(app).post(endpoint)
                .send({ __proto__: { polluted: true } });
            console.log(res.status, res.body);
            expect(res.status).toBe(400);
        });

        test("blocks constructor.prototype attack", async () => {
            const res = await request(app).post(endpoint)
                .send({ constructor: { prototype: { polluted: true } } });
            console.log(res.status, res.body);
            expect(res.status).toBe(400);
        });

        test("blocks nested pollution", async () => {
            const res = await request(app).post(endpoint)
                .send({ a: [{ b: { __proto__: { polluted: true } } }] });
            console.log(res.status, res.body);
            expect(res.status).toBe(400);
        });

        test("blocks array-only pollution", async () => {
            const res = await request(app)
                .post(endpoint)
                .send([{ __proto__: { polluted: true } }]);
            console.log(res.status, res.body);
            expect(res.status).toBe(400);
        });

        // URLENCODED
        test("blocks urlencoded __proto__", async () => {
            const res = await request(app)
                .post(endpoint)
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send("__proto__[polluted]=true");
            console.log(res.status, res.body);
            expect(res.status).toBe(400);
        });

        test("blocks deep qs attack", async () => {
            const res = await request(app)
                .post(endpoint)
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send("a[b][c][constructor][prototype][polluted]=true");
            console.log(res.status, res.body);
            expect(res.status).toBe(400);
        });

        test("blocks multipart attack", async () => {
            const res = await request(app)
                .post(endpoint)
                .set("Content-Type", "multipart/form-data")
                .field("__proto__[polluted]", "true");
            console.log(res.status, res.body);
            expect(res.status).toBe(400);
        });

        test("blocks query string pollution", async () => {
            const res = await request(app)
                .post(`${endpoint}?__proto__[polluted]=true`)
                .send({});
            console.log(res.status, res.body);
            expect(res.status).toBe(400);
        });

        test("blocks route param pollution", async () => {
            const res = await request(app)
                .post(`${endpoint}/__proto__`)
                .send({});
            console.log(res.status, res.body);
            expect(res.status).toBeLessThan(500);
        });

        test("blocks qs hybrid attack", async () => {
            const res = await request(app)
                .post(endpoint)
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send("constructor.prototype[polluted]=true");
            console.log(res.status, res.body);
            expect(res.status).toBe(400);
        });

        test("blocks parameter pollution", async () => {
            const res = await request(app)
                .post(endpoint)
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send("__proto__=safe&__proto__[polluted]=true");
            console.log(res.status, res.body);
            expect(res.status).toBe(400);
        });

        test("blocks encoded constructor attack", async () => {
            const res = await request(app)
                .post(endpoint)
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send("c%6Fnstructor[prototype][polluted]=true");
            console.log(res.status, res.body);
            expect(res.status).toBe(400);
        });

        test("blocks deep qs bypass", async () => {
            const res = await request(app)
                .post(endpoint)
                .set("Content-Type", "application/x-www-form-urlencoded")
                .send("aaaaaaaaaa[constructor][prototype][polluted]=true");
            console.log(res.status, res.body);
            expect(res.status).toBe(400);
        });

    });
}