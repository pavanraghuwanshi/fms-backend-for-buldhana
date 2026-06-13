// controllers/materialOwner.controller.js

const MaterialOwner = require("../model/materialOwner");
const mongoose = require("mongoose");


// ➤ CREATE
exports.createMaterialOwner = async (req, res) => {
  try {
    const { name, contactNumber, email, address, supervisorId: bodySupervisorId } = req.body;

    // Required validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    // Email validation
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // ✅ ROLE-BASED supervisorId setup
    let finalSupervisorId;

    if (req.user.role === "superadmin") {
      if (!bodySupervisorId || !mongoose.Types.ObjectId.isValid(bodySupervisorId)) {
        return res.status(400).json({
          success: false,
          message: "Valid supervisorId is required",
        });
      }
      finalSupervisorId = bodySupervisorId;

    } else if (req.user.role === "user") {
      finalSupervisorId = req.user.id;

    } else if (req.user.role === "worker") {
      if (!req.user.supervisor) {
        return res.status(400).json({
          success: false,
          message: "Supervisor not found for worker",
        });
      }
      finalSupervisorId = req.user.supervisor;

    } else {
      return res.status(403).json({
        success: false,
        message: "Invalid role",
      });
    }

    // ✅ Create data
    const data = new MaterialOwner({
      name: name.trim(),
      contactNumber: contactNumber?.trim(),
      email: email?.trim().toLowerCase(),
      address: address?.trim(),
      supervisorId: finalSupervisorId, // 🔥 correct value
      createdBy: req.user?.id,
    });

    await data.save();

    res.status(201).json({
      success: true,
      message: "Material Owner created",
      data,
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};


// ➤ GET ALL (with search + pagination)
exports.getMaterialOwners = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "", companyId } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    let filter = {};

    // ✅ ROLE BASED FILTER
    if (req.user.role === "user") {
      filter.supervisorId = req.user.id;

    } else if (req.user.role === "worker") {
      filter.supervisorId = req.user.supervisor;
    }

    // company filter
    if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
      filter.companyId = new mongoose.Types.ObjectId(companyId);
    }

    // search
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");

      filter.$or = [
        { name: regex },
        { contactNumber: regex },
        { email: regex },
      ];
    }

    const data = await MaterialOwner.find(filter)
      .select("-__v")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await MaterialOwner.countDocuments(filter);

    res.json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


//  ➤ GET Dropdown (id + name only, with search)
exports.getMaterialOwnerDropdown = async (req, res) => {
  try {
    let { page = 1, limit = 20, search = "", companyId } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 20;

    let filter = {};

    // ✅ ROLE FILTER
    if (req.user.role === "user") {
      filter.supervisorId = req.user.id;

    } else if (req.user.role === "worker") {
      filter.supervisorId = req.user.supervisor;
    }

    // company filter
    if (companyId && mongoose.Types.ObjectId.isValid(companyId)) {
      filter.companyId = new mongoose.Types.ObjectId(companyId);
    }

    // search
    if (search && search.trim()) {
      filter.name = { $regex: search.trim(), $options: "i" };
    }

    const data = await MaterialOwner.find(filter)
      .select("_id name")
      .sort({ name: 1 })
      // .skip((page - 1) * limit)
      // .limit(limit);

    const total = await MaterialOwner.countDocuments(filter);

    res.json({
      success: true,
      page,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
      data,
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



// ➤ UPDATE
exports.updateMaterialOwner = async (req, res) => {
  try {
    const id = req.params.id;

    let filter = { _id: id };

    // ✅ ROLE CHECK
    if (req.user.role === "user") {
      filter.supervisorId = req.user.id;

    } else if (req.user.role === "worker") {
      filter.supervisorId = req.user.supervisor;
    }

    const data = await MaterialOwner.findOneAndUpdate(
      filter,
      req.body,
      { new: true }
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Material Owner not found or access denied",
      });
    }

    res.json({
      success: true,
      message: "Updated successfully",
      data,
    });

  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};


// ➤ DELETE (soft delete recommended)
exports.deleteMaterialOwner = async (req, res) => {
  try {
    const id = req.params.id;

    let filter = { _id: id };

    // ✅ ROLE BASED ACCESS CONTROL
    if (req.user.role === "user") {
      filter.supervisorId = req.user.id;

    } else if (req.user.role === "worker") {
      filter.supervisorId = req.user.supervisor;
    }

    const data = await MaterialOwner.findOneAndDelete(filter);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Material Owner not found or access denied",
      });
    }

    res.json({
      success: true,
      message: "Material Owner deleted permanently",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};