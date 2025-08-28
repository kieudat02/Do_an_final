const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },
        slug: {
            type: String,
            unique: true,
            sparse: true, 
        },
        fullSlug: {
            type: String,
            unique: true,
            sparse: true, 
        },
        description: {
            type: String,
            trim: true,
        },
        // Tiêu đề marketing cố định cho trang danh mục (hiển thị H1)
        pageTitle: {
            type: String,
            trim: true,
            default: "",
        },
        // Phụ đề/khẩu hiệu/mô tả ngắn phía dưới H1
        pageSubtitle: {
            type: String,
            trim: true,
            default: "",
        },

        status: {
            type: String,
            default: "Hoạt động",
            enum: ["Hoạt động", "Không hoạt động"],
        },
        createdBy: {
            type: String,
            default: "System",
        },
        updatedBy: {
            type: String,
            default: "System",
        },
    },
    {
        timestamps: true,
    }
);

// Tạo index cho name, không phân biệt hoa thường
categorySchema.index({ name: 1 }, { 
    unique: true, 
    collation: { locale: 'en', strength: 2 } 
});

module.exports = mongoose.model("Category", categorySchema);
