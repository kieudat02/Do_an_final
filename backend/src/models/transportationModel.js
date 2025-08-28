const mongoose = require("mongoose");
const { Schema } = mongoose;

const TransportationSchema = new Schema(
  {
    title: { 
      type: String, 
      required: [true, 'Tên phương tiện là bắt buộc'], 
      unique: true, 
      maxlength: [255, 'Tên phương tiện không được vượt quá 255 ký tự'],
      trim: true
    },
    slug: { type: String, unique: true, sparse: true },
    fullSlug: { type: String, unique: true, sparse: true },
    information: { 
      type: String,
      trim: true
    },
    status: { type: Boolean, default: true },
    deleted: { type: Boolean, default: false },
    createdBy: { type: String, default: 'System' },
    updatedBy: { type: String, default: 'System' },
    deletedBy: { type: String, default: 'System' },
  },
  { timestamps: true, collection: "transportation" }
);

module.exports = mongoose.model("Transportation", TransportationSchema);