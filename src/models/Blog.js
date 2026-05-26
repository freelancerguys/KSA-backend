import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    excerpt: { type: String, default: '' },
    content: { type: String, required: true },
    thumbnail: { type: String, default: '' },
    author: { type: String, default: 'Kalyani Shooting Academy' },
    isPublished: { type: Boolean, default: true },
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Blog = mongoose.model('Blog', blogSchema);
