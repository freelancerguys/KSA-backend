import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import * as cms from '../controllers/cmsController.js';

const router = Router();

router.get('/public', cms.getPublicContent);

const adminCrud = (ctrl, field = 'image') => {
  const r = Router();
  r.get('/', ctrl.list);
  r.get('/:id', ctrl.get);
  r.post('/', protect, authorize('admin'), upload.single(field), ctrl.create);
  r.put('/:id', protect, authorize('admin'), upload.single(field), ctrl.update);
  r.delete('/:id', protect, authorize('admin'), ctrl.remove);
  return r;
};

router.use('/blogs', adminCrud(cms.blog, 'thumbnail'));
router.get('/blogs/slug/:slug', cms.blog.get);
router.use('/achievements', adminCrud(cms.achievement));
router.use('/gallery', adminCrud(cms.gallery));
router.use('/activities', adminCrud(cms.activity));

router.get('/settings', protect, authorize('admin'), cms.getSettings);
router.put('/settings', protect, authorize('admin'), cms.updateSettings);

export default router;
