const Consignee = require("../model/consigneeModel");

// CREATE
exports.createConsignee = async (req, res) => {
  try {
    const { name, address,pincode,contactNumber,contactPerson,gstNumber,panNumber, supervisorId, supervisorName, workerId } = req.body;

    // PERMISSION
    if (!["user", "worker"].includes(req.user.role)) {
      return res.status(403).json({
        message: "You are not authorized to create consignor",
      });
    }

    if (!name || !address) {
      return res.status(400).json({
        message: "Name and address are required",
      });
    }

    const payload = { name, address, pincode, contactNumber, contactPerson, gstNumber, panNumber };

    // ROLE BASED PAYLOAD
    if (req.user.role === "user") {
      payload.supervisorId = req.user.id;
      payload.supervisorName = req.user.username;
    }

    if (req.user.role === "worker") {
      payload.workerId = req.user.id;
      payload.supervisorId = req.user.supervisor;
      payload.supervisorName = req.user.supervisorName;
    }
    
    const consignee = await Consignee.create(payload);

    res.status(201).json({
      message: "Consignee created successfully",
      consignee,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET ALL
exports.getAllConsignees = async (req, res) => {
  try {
    if (!["user", "worker"].includes(req.user.role)) {
      return res.status(403).json({
        message: "You are not authorized to view consignees",
      });
    }

    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;

    const filter = { isDeleted: false };

    // ✅ ROLE FILTER
    if (req.user.role === "user") {
      filter.supervisorId = req.user.id;
    }

    if (req.user.role === "worker") {
      filter.supervisorId = req.user.supervisor;
    }

    // ✅ SEARCH FILTER (fields adjust kar lena schema ke according)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [consignees, total] = await Promise.all([
      Consignee.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Consignee.countDocuments(filter),
    ]);

    res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      count: consignees.length,
      consignees,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// GET BY ID
exports.getConsigneeById = async (req, res) => {
  try {
    if (!["user", "worker"].includes(req.user.role)) {
      return res.status(403).json({
        message: "You are not authorized to view consignee",
      });
    }

    const filter = {
      _id: req.params.id,
      isDeleted: false,
    };

    if (req.user.role === "user") {
      filter.supervisorId = req.user.id;
    }

    if (req.user.role === "worker") {
      filter.supervisorId = req.user.supervisor;
    }

    const consignee = await Consignee.findOne(filter);

    if (!consignee) {
      return res.status(404).json({ message: "Consignee not found" });
    }

    res.status(200).json(consignee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// UPDATE
exports.updateConsignee = async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({
        message: "Only supervisor can update consignee",
      });
    }

    const updateData = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.address !== undefined) updateData.address = req.body.address;
    if (req.body.pincode !== undefined) updateData.pincode = req.body.pincode;
    if (req.body.contactNumber !== undefined) updateData.contactNumber = req.body.contactNumber;
    if (req.body.contactPerson !== undefined) updateData.contactPerson = req.body.contactPerson;
    if (req.body.gstNumber !== undefined) updateData.gstNumber = req.body.gstNumber;
    if (req.body.panNumber !== undefined) updateData.panNumber = req.body.panNumber;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "No fields provided to update",
      });
    }

    const consignee = await Consignee.findOneAndUpdate(
      {
        _id: req.params.id,
        supervisorId: req.user.id,
        isDeleted: false,
      },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!consignee) {
      return res.status(404).json({ message: "Consignee not found" });
    }

    res.status(200).json({
      message: "Consignee updated successfully",
      consignee,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// SOFT DELETE
exports.softdeleteConsignee = async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({
        message: "Only supervisor can delete consignee",
      });
    }

    const consignee = await Consignee.findOneAndUpdate(
      {
        _id: req.params.id,
        supervisorId: req.user.id,
        isDeleted: false,
      },
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      { new: true }
    );

    if (!consignee) {
      return res.status(404).json({ message: "Consignee not found" });
    }

    res.status(200).json({
      message: "Consignee deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

