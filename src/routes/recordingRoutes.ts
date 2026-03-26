import { Router, Request, Response, NextFunction } from 'express';
import { tenantAuthMiddleware } from '../middleware/auth';
import { recordingUploadMiddleware } from '../middleware/upload';
import * as recordingController from '../controllers/recordingController';
import * as sessionController from '../controllers/sessionController';

const router = Router();
router.post(
  '/upload',
  tenantAuthMiddleware,
  (req: Request, res: Response, next: NextFunction) => {
    recordingUploadMiddleware(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err.message || 'File upload failed' });
        return;
      }
      next();
    });
  },
  recordingController.uploadRecordingHandler
);
/** GET /api/recordings/sessions - Tenant user's own past sessions (requires tenant auth) */
router.get('/sessions', tenantAuthMiddleware, sessionController.getMySessions);
export default router;
