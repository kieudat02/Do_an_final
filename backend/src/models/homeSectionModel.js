const mongoose = require("mongoose");
const slugify = require("slugify");

// Tùy biến trường createdBy, updatedBy nếu có user hệ thống (khuyến khích)
const homeSectionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },

    categories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    }],

    moreButtonSlug: { type: String, trim: true, unique: true },
    moreButtonTitle: { type: String, trim: true },
    moreButtonSubtitle: { type: String, trim: true },

    filterQuery: { type: Object, default: {} },

    createdBy: { type: String, default: 'System' },
    updatedBy: { type: String, default: 'System' },
  },
  { timestamps: true }
);

// Hook tạo slug tự động, đảm bảo không trùng lặp
homeSectionSchema.pre("save", async function (next) {
  // Tạo slug từ moreButtonTitle nếu có, ngược lại dùng title
  const sourceText = this.moreButtonTitle || this.title;
  if (!this.isModified("title") && !this.isModified("moreButtonTitle")) return next();
  
  let baseSlug = slugify(sourceText, { lower: true, strict: true, locale: 'vi' });
  let slug = baseSlug, counter = 1;
  // Check trùng trong DB
  while (await mongoose.models.HomeSection.findOne({ moreButtonSlug: slug, _id: { $ne: this._id } })) {
    slug = `${baseSlug}-${counter++}`;
  }
  this.moreButtonSlug = slug;
  next();
});

homeSectionSchema.index({ isActive: 1, order: 1 }); // Compound index cho truy vấn chính
homeSectionSchema.index({ moreButtonSlug: 1 }, { unique: true });

module.exports = mongoose.model("HomeSection", homeSectionSchema);