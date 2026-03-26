import express from "express";
import productsRoutes from "@/routes/products/index"
import helmet from "helmet";
//create app
const app = express();
//define port
const port = 3000;
app.use(helmet());

app.use(express.urlencoded({ //Add a pre-validation guard for urlencoded ONLY (tight integration)
    extended: true,
    limit: "10kb",
    parameterLimit: 1000,
}))
app.use(express.json()); 



//products endpoint
app.use('/api/v1/', productsRoutes);

app.listen(port, ()=>{
    console.log(`Listening for requests on port ${port}`);
});