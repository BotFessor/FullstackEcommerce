import {Router} from 'express';

const router = Router();
//products endpoints
///api/v1/products
router.get('/', (req, res) => {
    res.send("List of products")
});

router.get('/:id', (req, res) => {
    res.send(`Product with ID: ${req.params.id}`)
});

router.post('/', (req, res) => {
    res.send("Authorized to Create new products");
});

export default router;