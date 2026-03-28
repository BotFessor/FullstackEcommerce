import express from "express";
import productsRoutes from "@/routes/products.routes"
import helmet from "helmet";
import qs from "qs";
import { NextFunction } from 'express';
//create app
export const app = express();
//define port
app.use(helmet());

app.use(express.urlencoded({ //Add a pre-validation guard for urlencoded ONLY (tight integration)
    extended: true,
    limit: "10kb",
    parameterLimit: 100,
    verify: (req, res, buf) => {
        if (buf.length > 10240) throw new Error("Payload too large");
    }
}));

//Add JSON Size Limit(DoS Risk). Attackers can send: { "a": "A".repeat(100MB) }
app.use(express.json({
    limit: "100kb",
}));


//Put before routes, This config affects req.query parsing,It protects:
//req.query, against nested query attacks, qs prototype pollution
app.set("query parser", (str: string) =>
    qs.parse(str, {
        allowPrototypes: false,
        depth: 5,
        parameterLimit: 100,
        arrayLimit: 20,
        strictNullHandling: true,
    })
);

app.use('/api/v1/', productsRoutes); //products middleware

//Error Handler middleware comes last






