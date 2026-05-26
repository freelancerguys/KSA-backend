import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Diary } from '../models/Diary.js';

export const getDiaries = asyncHandler(async (req, res) => {
  const filter = { student: req.student._id };
  if (req.query.date) {
    const d = new Date(req.query.date);
    const start = new Date(d.setHours(0, 0, 0, 0));
    const end = new Date(d.setHours(23, 59, 59, 999));
    filter.entryDate = { $gte: start, $lte: end };
  }
  if (req.query.search) {
    filter.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { content: { $regex: req.query.search, $options: 'i' } },
    ];
  }
  const diaries = await Diary.find(filter).sort('-entryDate');
  res.json({ success: true, data: diaries });
});

export const createDiary = asyncHandler(async (req, res) => {
  const diary = await Diary.create({
    student: req.student._id,
    title: req.body.title,
    content: req.body.content,
    entryDate: req.body.entryDate || new Date(),
  });
  res.status(201).json({ success: true, data: diary });
});

export const updateDiary = asyncHandler(async (req, res) => {
  const diary = await Diary.findOne({ _id: req.params.id, student: req.student._id });
  if (!diary) throw new ApiError(404, 'Diary not found');
  Object.assign(diary, req.body);
  await diary.save();
  res.json({ success: true, data: diary });
});

export const deleteDiary = asyncHandler(async (req, res) => {
  const diary = await Diary.findOneAndDelete({ _id: req.params.id, student: req.student._id });
  if (!diary) throw new ApiError(404, 'Diary not found');
  res.json({ success: true, message: 'Deleted' });
});
