import { Router } from "express";
import { productsRouter} from "./products.routes";

export const allRouters = Router();

allRouters.use("/products", productsRouter);
//allRouters.use("/users", usersRouter);
//allRouters.use("/payments", paymentsRouter);
//allRouters.use("/airtime", airtimeRouter);