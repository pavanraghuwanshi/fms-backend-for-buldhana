const Railhead = require('../model/Railhead');

// CREATE
exports.createRailhead = async (req, res) => {
  try {
    const { roleType, id } = req.user;

    const payload = {
      ...req.body,
      supervisorId: id // ✅ always from logged-in user
    };

    const data = await Railhead.create(payload);

    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// GET ALL
exports.getRailheads = async (req, res) => {
  try {
    const {role, roleType, id, AssignedBranch = [] } = req.user;

    let { page = 1, limit = 10, fromDate, toDate } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const filter = {};

    // 🔥 ROLE BASED FILTER
    if (roleType === "school") {
      filter.supervisorId = id;
    }

    if (roleType === "branch") {
      filter.supervisorId = id;
    }

    if (roleType === "branchGroup") {
      filter.supervisorId = id;
    }

    if (role === "worker") filter.supervisorId = req.user.supervisor;

    // superadmin → no filter

    // 📅 DATE FILTER
    if (fromDate || toDate) {
      filter.createdAt = {};

      if (fromDate) filter.createdAt.$gte = new Date(fromDate);

      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }

    const data = await Railhead.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Railhead.countDocuments(filter);

    return res.status(200).json({
      total,
      page,
      limit,
      data,
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


// GET BY ID
exports.getRailheadById = async (req, res) => {
  try {
    const { roleType, id, AssignedBranch = [] } = req.user;

    let filter = { _id: req.params.id };

    // 🔥 ROLE CHECK
    if (roleType === "school" || roleType === "branch") {
      filter.supervisor = id;
    }

    if (roleType === "branchGroup") {
      filter.supervisor = id;
    }

    const data = await Railhead.findOne(filter).populate("productId");

    if (!data) {
      return res.status(404).json({ message: "Not found or unauthorized" });
    }

    res.json(data);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPDATE
exports.updateRailhead = async (req, res) => {
  try {
    const { roleType, id, AssignedBranch = [] } = req.user;

    const updates = req.body;

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No fields provided" });
    }

    let filter = { _id: req.params.id };

    // 🔥 ROLE CHECK
    if (roleType === "school" || roleType === "branch") {
      filter.supervisorId = id;
    }

    if (roleType === "branchGroup") {
      filter.supervisorId = id;
    }

    const updated = await Railhead.findOneAndUpdate(
      filter,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Not found or unauthorized" });
    }

    res.json(updated);

  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


// DELETE
exports.deleteRailhead = async (req, res) => {
  try {
    const { roleType, id, AssignedBranch = [] } = req.user;

    let filter = { _id: req.params.id };

    if (roleType === "school" || roleType === "branch") {
      filter.supervisor = id;
    }

    if (roleType === "branchGroup") {
      filter.supervisor = id;
    }

    const data = await Railhead.findOneAndDelete(filter);

    if (!data) {
      return res.status(404).json({ message: "Not found or unauthorized" });
    }

    res.json({ message: "Deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
