import { Router } from 'express';
import {
  upload,
  getCollection,
  addCard,
  updateCard,
  deleteCard,
  previewImport,
  commitImport,
  importProgress,
  getImportHistory,
  syncFromEcho,
  getPortfolio,
  getStoreListings,
} from '../controllers/collectionController';

const router = Router();

// ─── Collection CRUD ──────────────────────────────────────────────────────────
router.get('/collection', getCollection);
router.post('/collection', addCard);
router.patch('/collection/:id', updateCard);
router.delete('/collection/:id', deleteCard);

// ─── Import ───────────────────────────────────────────────────────────────────
router.post('/collection/import/preview', upload.single('file'), previewImport);
router.post('/collection/import', upload.single('file'), commitImport);
router.get('/collection/import/progress/:jobId', importProgress);
router.get('/collection/import/history', getImportHistory);

// ─── Echo Sync ────────────────────────────────────────────────────────────────
router.post('/collection/sync/echo', syncFromEcho);

// ─── Portfolio & Store ────────────────────────────────────────────────────────
router.get('/collection/portfolio', getPortfolio);
router.get('/store', getStoreListings);

export default router;
