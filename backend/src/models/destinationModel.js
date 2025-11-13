const mongoose = require('mongoose');

const destinationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  slug: { type: String, unique: true, sparse: true },
  fullSlug: { type: String, unique: true, sparse: true },
  info: String,
  image: String, 
  status: { type: String, default: 'Hoạt động' },
  // Thêm trường quốc gia và châu lục
  country: { 
    type: String, 
    trim: true,
    default: null 
  },
  continent: { 
    type: String, 
    enum: ['Châu Á', 'Châu Âu', 'Châu Phi', 'Châu Mỹ', 'Châu Úc', 'Châu Nam Cực'],
    default: null 
  },
  // Thêm phân loại trong nước/nước ngoài
  type: {
    type: String,
    enum: ['Trong nước', 'Nước ngoài'],
    default: 'Trong nước'
  },
  // Thêm trường URL động
  urlPath: {
    type: String,
    unique: true,
    sparse: true
  },
  // Thêm trường parent để tạo hierarchy
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Destination',
    default: null
  },
  // Thêm trường level để phân cấp
  level: {
    type: Number,
    default: 1
  },
  createdBy: { type: String, default: 'System' },
  updatedBy: { type: String, default: 'System' },
}, {
  timestamps: true 
});

module.exports = mongoose.model('Destination', destinationSchema);