import slugify from 'slugify';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Blog } from '../models/Blog.js';
import { Achievement } from '../models/Achievement.js';
import { Gallery } from '../models/Gallery.js';
import { Activity } from '../models/Activity.js';
import { Settings } from '../models/Settings.js';
import { saveUploadedFile } from '../services/uploadService.js';

const parseBody = (body) => {
  const data = { ...body };
  Object.keys(data).forEach((key) => {
    if (data[key] === 'true') data[key] = true;
    if (data[key] === 'false') data[key] = false;
    if (key.toLowerCase().includes('date') && data[key]) {
      const d = new Date(data[key]);
      if (!Number.isNaN(d.getTime())) data[key] = d;
    }
    if (key === 'order' && data[key] !== undefined && data[key] !== '') {
      data[key] = Number(data[key]);
    }
  });
  return data;
};

const crud = (Model, options = {}) => ({
  list: asyncHandler(async (req, res) => {
    const filter = options.publicOnly && !req.user ? { isPublished: true } : {};
    const items = await Model.find(filter).sort(options.sort || '-createdAt');
    res.json({ success: true, data: items });
  }),
  get: asyncHandler(async (req, res) => {
    const query = req.params.slug
      ? { slug: req.params.slug }
      : { _id: req.params.id };
    const item = await Model.findOne(query);
    if (!item) throw new ApiError(404, 'Not found');
    res.json({ success: true, data: item });
  }),
  create: asyncHandler(async (req, res) => {
    const data = parseBody(req.body);
    if (req.file) data[options.imageField || 'image'] = await saveUploadedFile(req.file);
    if (options.slugField && data.title) {
      data.slug = slugify(data.title, { lower: true, strict: true });
    }
    const item = await Model.create(data);
    res.status(201).json({ success: true, data: item });
  }),
  update: asyncHandler(async (req, res) => {
    const item = await Model.findById(req.params.id);
    if (!item) throw new ApiError(404, 'Not found');
    Object.assign(item, parseBody(req.body));
    if (req.file) item[options.imageField || 'image'] = await saveUploadedFile(req.file);
    if (options.slugField && req.body.title) {
      item.slug = slugify(req.body.title, { lower: true, strict: true });
    }
    await item.save();
    res.json({ success: true, data: item });
  }),
  remove: asyncHandler(async (req, res) => {
    const item = await Model.findByIdAndDelete(req.params.id);
    if (!item) throw new ApiError(404, 'Not found');
    res.json({ success: true, message: 'Deleted' });
  }),
});

export const blog = crud(Blog, { slugField: true, imageField: 'thumbnail', publicOnly: true });
export const achievement = crud(Achievement, { imageField: 'image', sort: '-achievementDate' });
export const gallery = crud(Gallery, { imageField: 'image', sort: 'order' });
export const activity = crud(Activity, { imageField: 'image', sort: '-eventDate' });

export const getPublicContent = asyncHandler(async (req, res) => {
  const [blogs, achievements, galleryItems, activities, settings] = await Promise.all([
    Blog.find({ isPublished: true }).sort('-createdAt').limit(6),
    Achievement.find().sort('-achievementDate').limit(8),
    Gallery.find().sort('order').limit(12),
    Activity.find().sort('-eventDate').limit(6),
    Settings.find(),
  ]);

  const settingsMap = settings.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {});

  res.json({
    success: true,
    data: { blogs, achievements, gallery: galleryItems, activities, settings: settingsMap },
  });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const { key, value } = req.body;
  const setting = await Settings.findOneAndUpdate(
    { key },
    { value },
    { upsert: true, new: true }
  );
  res.json({ success: true, data: setting });
});

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.find();
  const map = settings.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {});
  res.json({ success: true, data: map });
});
