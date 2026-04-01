import express, {Request, Response, NextFunction} from "express";
import {allRouters} from "@/routes"
import helmet from "helmet";
import qs from "qs";
import hpp from "hpp";
import cors from "cors";
import cookieParser from "cookie-parser";

export const app = express();
/* ====================================================
CORS: Frontend ↔ Backend Communication (adjust for your frontend-backend communication) i.e
Without it, your frontend can't talk to your backend securely.
Note: Credentials:true, is REQUIRED for cookies
            app.use(
                cors({
                    origin: ["https://your-frontend.com or http://localhost:3000"],
                    credentials: true
                })
            );
   ==================================================== */
app.use(cors({ 
    origin: "http://localhost:3001", 
    credentials: true 
}));
/* ====================================================
-Protects against common browser attacks
-Protects against XSS, clickjacking,
   ==================================================== */
app.use(helmet()); // headers
/* ====================================================
   hpp removes duplicate params by default and protects against HTTP query parameter pollution, BUT it can break also legit use cases like:
   GET /products?category=books&category=electronics
   If your API expects arrays like that, you must whitelist:
            app.use(
                hpp({
                    whitelist: ["category", "tags"]
                })
            );
When it is best practice ✅
You should almost always include app.use(hpp()) if your API:
-Accepts query parameters (most APIs do)
-Has auth / roles / filters in query
-Is exposed to the public (internet-facing)
-Uses multiple layers (CDN, proxy, gateway, etc.)
👉 In your case (secure API, webhooks, validation middleware):
Yes — you SHOULD include it.

When it’s less necessary 🤏
You might skip or limit it if:
-Your API never uses query params
-You strictly use JSON body only
-You already normalize params at a gateway level (e.g. Kong, Nginx)
But even then:
👉 It’s still cheap protection, so most teams keep it.
   ==================================================== */
app.use(hpp());
/* ====================================================
   VERY IMPORTANT if behind proxy / Render / Nginx
   Why:
        -Required for correct IP logging
        -Needed for rate limiting later
   ==================================================== */
//app.set("trust proxy", 1);
/* ====================================================
   -Add a pre-validation guard for urlencoded ONLY
   ==================================================== */
app.use(express.urlencoded({
    extended: true,
    limit: "10kb",
    parameterLimit: 100,
    verify: (req, res, buf) => {
        (req as any).rawBody = buf.toString("utf8"); // ✅ ADD
        if (buf.length > 10240) throw new Error("Payload too large");
    }
}));
/* ====================================================
Add JSON Size Limit(DoS Risk). Attackers can send: { "a": "A".repeat(100MB) }
-Prevents large payload abuse
-strict: true blocks primitives like "string"
   ==================================================== */
app.use(express.json({
    limit: "100kb",  
    verify: (req, res, buf) => {
        (req as any).rawBody = buf.toString("utf8"); // ✅ ADD
    },
    strict: true,
}));
/* ====================================================
   -It just parses: req.cookies.token
   -cookie-parser → extracts cookie
   -It’s part of how HTTP handles cookies. JWT just happens to be stored inside
a cookie.
   ==================================================== */
app.use(cookieParser());
/* ====================================================
Put before routes, This config protects:
req.query against nested query attacks, qs prototype pollution
   ==================================================== */
app.set("query parser", (str: string) =>
    qs.parse(str, {
        allowPrototypes: false,
        depth: 5,
        parameterLimit: 100,
        arrayLimit: 20,
        strictNullHandling: true,
    })
);

app.use('/api/v1/', allRouters); //products middleware

/* ====================================================
   Global error handler
   ==================================================== */
app.use(
    (err: any, req: Request, res: Response, next: NextFunction) => {
        console.error(err);
        res.status(err.status || 500).json({
            error: "Internal Server Error"
        });
    }
);