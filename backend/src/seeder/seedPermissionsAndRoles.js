const mongoose = require('mongoose');
const Permission = require('../models/Permission');
const Role = require('../models/Role');

const permissions = [
  { name: "CREATE_TOUR", description: "Cho phép tạo tour mới" },
  { name: "READ_TOUR", description: "Cho phép xem thông tin tour" },
  { name: "UPDATE_TOUR", description: "Cho phép cập nhật thông tin tour" },
  { name: "DELETE_TOUR", description: "Cho phép xóa tour" },
];

const roles = [
  { name: "Super Admin", description: "Người quản trị cao nhất" },
  { name: "Admin", description: "Quản trị viên" },
  { name: "Manager", description: "Quản lý" },
  { name: "Viewer", description: "Chỉ xem" }
];

async function seed() {
  await mongoose.connect('mongodb://localhost:27017/yourdb');
  await Permission.deleteMany({});
  await Role.deleteMany({});

  const createdPermissions = await Permission.insertMany(permissions);

  // Gán quyền cho từng role (ví dụ: Super Admin có tất cả, Viewer chỉ có quyền xem)
  const permMap = {};
  createdPermissions.forEach(p => permMap[p.name] = p._id);

  const roleData = [
    {
      name: "Super Admin",
      description: "Người quản trị cao nhất",
      permissions: createdPermissions.map(p => p._id)
    },
    {
      name: "Admin",
      description: "Quản trị viên",
      permissions: [
        permMap.CREATE_TOUR, permMap.READ_TOUR, permMap.UPDATE_TOUR, permMap.DELETE_TOUR
        // ... các quyền khác cho admin
      ]
    },
    {
      name: "Manager",
      description: "Quản lý",
      permissions: [
        permMap.READ_TOUR, permMap.UPDATE_TOUR
        // ... các quyền khác cho manager
      ]
    },
    {
      name: "Viewer",
      description: "Chỉ xem",
      permissions: [
        permMap.READ_TOUR
        // ... các quyền chỉ xem
      ]
    }
  ];

  await Role.insertMany(roleData);
  console.log("Seeded permissions and roles!");
  process.exit();
}

seed();