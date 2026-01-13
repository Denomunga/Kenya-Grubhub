import mongoose, { Document, Schema } from 'mongoose';

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  x?: string;
}

export interface SiteSettingsDoc extends Document {
  socialLinks: SocialLinks;
  createdAt: Date;
  updatedAt: Date;
}

const SiteSettingsSchema = new Schema<SiteSettingsDoc>(
  {
    socialLinks: {
      instagram: { type: String, required: false },
      facebook: { type: String, required: false },
      x: { type: String, required: false },
    },
  },
  { timestamps: true }
);

export const SiteSettings = mongoose.models.SiteSettings || mongoose.model('SiteSettings', SiteSettingsSchema);
