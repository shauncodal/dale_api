import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as avatarController from '../controllers/avatarController';
import { requireAdminAuth, requirePermission } from '../middleware/rbac';
import { avatarUploadMiddleware } from '../middleware/upload';

const router = Router();
router.use(requireAdminAuth);

router.get('/', requirePermission('avatars:list'), avatarController.listAvatars);
router.get('/:id', requirePermission('avatars:read'), avatarController.getAvatar);

router.post('/upload', requirePermission('avatars:create'), (req: Request, res: Response, next: NextFunction) => {
  avatarUploadMiddleware.single('file')(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large' });
        }
        return res.status(400).json({ error: err.message });
      }
      return res.status(400).json({ error: err instanceof Error ? err.message : 'Upload failed' });
    }
    next();
  });
}, avatarController.uploadAvatar);
router.post('/', requirePermission('avatars:create'), avatarController.createAvatar);
router.patch('/:id', requirePermission('avatars:patch'), avatarController.patchAvatar);
router.delete('/:id', requirePermission('avatars:delete'), avatarController.deleteAvatar);
router.patch('/:id/live-config', requirePermission('avatars:patch'), avatarController.patchLiveConfig);
export default router;
