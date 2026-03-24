import {Router} from 'express';
import { createProductCtrl, deleteProductCtrl, getProductByIdCtrl, listProductsCtrl, updateProductCtrl } from './productsController';

const router = Router();
//products endpoints
// "/api/v1/products"
//suffix with .....Ctrl == Controller
//Suffix with .....Midlw == Middleware
router.get('/products', listProductsCtrl);
router.get('/products/:id', getProductByIdCtrl);
router.post('/products', createProductCtrl);
router.patch('/products/:id', updateProductCtrl); //prefer patch instead of router.put()
router.delete('/products/:id', deleteProductCtrl);

export default router;