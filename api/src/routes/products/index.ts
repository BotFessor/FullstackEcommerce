import {Router} from 'express';
import { createProductCtrl, deleteProductCtrl, getProductByIdCtrl, listProductsCtrl, updateProductCtrl } from './productsController';

const router = Router();
//products endpoints
// "/api/v1/products"
//suffix with .....Ctrl == Controller
//Suffix with .....Midlw == Middleware
router.get('/', listProductsCtrl);
router.get('/:id', getProductByIdCtrl);
router.post('/', createProductCtrl);
router.patch('/:id', updateProductCtrl);
router.delete('/:id', deleteProductCtrl);

export default router;