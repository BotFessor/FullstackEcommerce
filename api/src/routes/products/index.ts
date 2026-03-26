import {Router} from 'express';
import { validateRequest } from '@/middlewares/vcGradeValidationMiddleware';
import { createProductRequestSchema, deleteProductByIdRequestSchema, getProductByIdRequestSchema, getProductsRequestSchema, updateProductRequestSchema } from '../../utils/zodSchemas/products.schema';
import { createProductController, deleteProductController, getProductByIdController, listProductsController, updateProductController } from '@/routes/products/productsController';

const router = Router();
//products endpoints
// "/api/v1/products"
router.get('/products', validateRequest(getProductsRequestSchema, {}), listProductsController); //list all products
router.get('/products/:id',validateRequest(getProductByIdRequestSchema, {}), getProductByIdController); //get product by Id
router.post('/products', validateRequest(createProductRequestSchema, {}), createProductController); //create product
router.patch('/products/:id', validateRequest(updateProductRequestSchema, {}), updateProductController); //update product
router.delete('/products/:id', validateRequest(deleteProductByIdRequestSchema, {}), deleteProductController); //delete product

export default router;