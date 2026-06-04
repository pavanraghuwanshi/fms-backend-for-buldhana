const Device = require("../model/deviceModel");
const VehicleMaster = require("../model/maintenanceDevice.model");
const User = require("../model/userModel");
const VehicleDocument = require("../model/vehicleDocumentModel");

// exports.getDevices = async (req, res) => {
//   try {
//     const role = req.user.role;
//     const { search, page = 1, limit = Number.MAX_SAFE_INTEGER } = req.query;
//     const pageNumber = parseInt(page);
//     const limitNumber = parseInt(limit);
//     const startIndex = (pageNumber - 1) * limitNumber;
//     let filter = {};

//     if (search) {
//       filter.$or = [
//         { name: { $regex: search, $options: "i" } },
//         { uniqueId: { $regex: search, $options: "i" } },
//         { sim: { $regex: search, $options: "i" } },
//         { model: { $regex: search, $options: "i" } },
//         { category: { $regex: search, $options: "i" } },
//       ];
//     }

//     if (["user", "worker"].includes(role)) {
//       let userId;
//       if (role === "worker") userId = req.user.supervisor;
//       else userId = req.user.id;

//       const user = await User.findById(userId).select('groupsAssigned');
//       filter.$and = [{
//         $or: [
//           // { createdBy: userId },
//           // { users: userId },
//           { groups: { $in: user.groupsAssigned } },
//         ],
//       }];
//     }

//     const [totalDevices, devices] = await Promise.all([
//       Device.countDocuments(filter),
//       Device.find(filter).skip(startIndex).limit(limitNumber).select("name model category users").populate('users', 'username')
//     ])

//     return res.status(200).json({ totalDevices, currentPage: pageNumber, totalPages: Math.ceil(totalDevices / limitNumber), devices });
//   } catch (error) {
//     console.error("Error fetching devices:", error.message);
//     return res.status(500).json({ message: "Error fetching devices" + error.message });
//   }
// };

exports.getDevices = async (req, res) => {
  try {
    const { roleType, id } = req.user;

    const { search, page = 1, limit = Number.MAX_SAFE_INTEGER } = req.query;

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const startIndex = (pageNumber - 1) * limitNumber;

    let filter = {};

    // 🔎 search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { uniqueId: { $regex: search, $options: "i" } },
        { sim: { $regex: search, $options: "i" } },
        { model: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    // 🔥 roleType based filtering
    if (roleType === "school") {
      filter.schoolId = id;
    }

    if (roleType === "branch") {
      filter.branchId = id;
    }

    if (roleType === "branchGroup") {
      filter.branchId = { $in: req.user.AssignedBranch };
    }

    const [totalDevices, devices] = await Promise.all([
      Device.countDocuments(filter),
      Device.find(filter)
        .skip(startIndex)
        .limit(limitNumber)
        .select("name model category schoolId branchId")
        .populate("schoolId", "schoolName")
        .populate("branchId", "branchName"),
    ]);

    return res.status(200).json({
      totalDevices,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalDevices / limitNumber),
      devices,
    });

  } catch (error) {
    console.error("Error fetching devices:", error.message);
    return res.status(500).json({
      message: "Error fetching devices " + error.message,
    });
  }
};



exports.getDeviceById = async (req, res) => {
  try {
    const vehicleId = req.params.id;
    const [device, vehicleDocument] = await Promise.all([
      VehicleMaster.findById(vehicleId).select('name model category'),
      VehicleDocument.findOne({ vehicleId }).select('documents'),
    ]);

    if (!device) return res.status(404).json({ success: false, message: "Device not found" });

    const doc = {
      Insurance: false,
      rc: false,
      puc: false,
      fitnessCertificate: false,
    }
    if (vehicleDocument) {
      if (vehicleDocument.documents.Insurance.image.base64Data) {
        doc.Insurance = true
      }
      if (vehicleDocument.documents.rc.image.base64Data) {
        doc.rc = true
      }
      if (vehicleDocument.documents.puc.image.base64Data) {
        doc.puc = true
      }
      if (vehicleDocument.documents.fitnessCertificate.image.base64Data) {
        doc.fitnessCertificate = true
      }
    }

    return res.json({ success: true, device, vehicleDocument: doc });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error fetching device" + error.message });
  }
};
