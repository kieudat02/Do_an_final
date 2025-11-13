const mongoose = require('mongoose');

const rolePermissionSchema = new mongoose.Schema({
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  permissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  grantedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index để đảm bảo unique và tối ưu hóa truy vấn
rolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true });
rolePermissionSchema.index({ roleId: 1, isActive: 1 });
rolePermissionSchema.index({ permissionId: 1, isActive: 1 });

module.exports = mongoose.model('RolePermission', rolePermissionSchema);
