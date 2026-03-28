import {Router} from 'express';
import { validateRequestMiddleware } from '@/middlewares/validate.middleware';
import { createProductRequestSchema, deleteProductByIdRequestSchema, getProductByIdRequestSchema, getProductsRequestSchema, updateProductRequestSchema } from '@/utils/zodSchemas/products.schema';
import { createProductController, deleteProductController, getProductByIdController, listProductsController, updateProductController } from '@/controllers/products.controller';

const router = Router();
//products endpoints
// "/api/v1/products"
router.get('/products', validateRequestMiddleware(getProductsRequestSchema, {}), listProductsController); //list all products
router.get('/products/:id',validateRequestMiddleware(getProductByIdRequestSchema, {}), getProductByIdController); //get product by Id
router.post('/products', validateRequestMiddleware(createProductRequestSchema, {}), createProductController); //create product
router.patch('/products/:id', validateRequestMiddleware(updateProductRequestSchema, {}), updateProductController); //update product
router.delete('/products/:id', validateRequestMiddleware(deleteProductByIdRequestSchema, {}), deleteProductController); //delete product

export default router;







