import { prototypePollutionSuite } from "./test-cases";

/**
 * =======MOCK DB 
 * This ensures no real DB connections are attempted during tests.
 * getDb() is your lazy Neon/Drizzle loader, so mocking it prevents errors and speeds up tests.
 * Always add this mock at the top of every test file   ie filename.test.ts
 * */
//==========================
jest.mock("@/db", () => ({
    getDb: () => ({}), // returns a fake, empty DB instance
}));
//========================

/**
 * EXPECTED ERROR CODES IN TEST RESULTS
 *      400: Security violation (prototype pollution)-ATTACK
 *      415: Content-type mismatch
 *      422: Validation failure (Zod)
 */

//TEST PRODUCTS ENDPOINT: /api/v1/products
describe("Security: Products Endpoint", () => {
    prototypePollutionSuite("/api/v1/products");
});

//TEST USERS ENDPOINT: /api/v1/users
/*
 describe("Security: Users", () => {
     prototypePollutionSuite("/api/v1/users");
 });
 */

//TEST ACCOUNTS ENDPOINT: /api/v1/accounts
/*
 describe("Security: Users", () => {
     prototypePollutionSuite("/api/v1/accounts");
 });
 */