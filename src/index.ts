import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

// Import routes (we'll create these next)
import productRoutes from './api/routes/product.routes';
import identityRoutes from './api/routes/identity.routes';
import orderRoutes from './api/routes/order.routes';
import paymentRoutes from './api/routes/payment.routes';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/products', productRoutes);
app.use('/api/identity', identityRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📚 API Documentation available on http://localhost:${port}/api-docs`);
});
