const mongoose = require("mongoose");
const { Schema } = mongoose;

const TourSchema = new Schema({
    title: { type: String, required: true },
    code: { type: String, unique: true },
    slug: { type: String, unique: true }, // Add slug field
    image: { type: String }, // Main image (for backward compatibility)
    images: [{ type: String }], // Array of image URLs
    status: { type: Boolean, default: true },
    highlight: { type: Boolean, default: false },
    price: { type: Number, required: true },
    totalPrice: { type: Number, default: 0 }, // Tổng giá từ tour details
    minPrice: { type: Number, default: 0 }, // Giá tối thiểu từ tour details (cache)
    maxPrice: { type: Number, default: 0 }, // Giá tối đa từ tour details (cache)
    category: { type: Schema.Types.ObjectId, ref: "Category" },
    departure: { type: Schema.Types.ObjectId, ref: "Departure" },
    destination: { type: Schema.Types.ObjectId, ref: "Destination" },
    transportation: { type: Schema.Types.ObjectId, ref: "Transportation" },
    
    // Thêm các trường hỗ trợ filter nâng cao
    country: { type: String }, // Quốc gia (cho tour quốc tế)
    tags: [{ type: String }], // Các tag mô tả tour (biển, núi, văn hóa, ẩm thực, etc.)
    
    startDate: { type: Date },
    endDate: { type: Date },
    attractions: { type: String }, // Điểm tham quan
    cuisine: { type: String }, // Ẩm thực
    suitableTime: { type: String }, // Thời gian thích hợp
    suitableObject: { type: String }, // Đối tượng thích hợp
    vehicleInfo: { type: String }, // Thông tin phương tiện chi tiết
    promotion: { type: String }, 
    promotions: [{ 
        label: { type: String }
    }],

    itinerary: [{
        day: { type: Number, required: true },
        title: { type: String, required: true },
        details: { type: String },
        meals: { type: String },
        image: { type: String },
        dayStart: { type: Date }
    }],

    // New structured fields
    overview: {
        introHtml: { type: String, default: '' },
        description: { type: String, default: '' }, // Thêm trường mô tả thay thế cho badges và images
        pricing: {
            yearTitle: { type: String, default: '' },
            rows: [{
                dateLabel: { type: String },
                priceText: { type: String }
            }],
            noteHtml: { type: String, default: '' }
        },
        promotions: [{
            label: { type: String },
            desc: { type: String }
        }]
    },

    includes: {
        included: [{ type: String }],
        excluded: [{ type: String }],
        notes: {
            important: [{ type: String }]
        }
    },

    highlights: [{ type: String }],

    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
    views: { type: Number, default: 0, min: 0 },
    createdBy: { type: String, default: 'System' },
    updatedBy: { type: String, default: 'System' },
    deleted: { type: Boolean, default: false },
    deletedBy: { type: String, default: null },
}, { timestamps: true, collection: "tour" });

// Function to generate slug from title
function generateSlug(title) {
    return title
        .toLowerCase()
        .trim()
        .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
        .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
        .replace(/[ìíịỉĩ]/g, 'i')
        .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
        .replace(/[ùúụủũưừứựửữ]/g, 'u')
        .replace(/[ỳýỵỷỹ]/g, 'y')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

// Pre-save middleware to generate slug
TourSchema.pre('save', async function(next) {
    if (this.isModified('title') || this.isNew) {
        let baseSlug = generateSlug(this.title);
        let slug = baseSlug;
        let counter = 1;
        
        // Check if slug already exists and append number if needed
        while (true) {
            const existingTour = await this.constructor.findOne({ 
                slug: slug, 
                _id: { $ne: this._id } 
            });
            
            if (!existingTour) {
                this.slug = slug;
                break;
            }
            
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
    }
    next();
});

module.exports = mongoose.model("Tour", TourSchema);