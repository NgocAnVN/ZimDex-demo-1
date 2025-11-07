// server.js
import express from 'express';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// nén + static
app.use(compression());
app.use(express.static(__dirname, {
  extensions: ['html'], // truy cập / sẽ trả index.html
  setHeaders: (res, filePath) => {
    // dev: tắt cache để F5 thấy ngay thay đổi
    res.setHeader('Cache-Control', 'no-store');
  }
}));

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`ZimDex running at http://localhost:${PORT}`);
});