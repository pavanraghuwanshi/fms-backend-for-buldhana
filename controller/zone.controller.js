const Zone = require("../model/zone.model");

const roleModelMap = {
  school: "School",
  branch: "Branch",
  branchGroup: "BranchGroup",
};

const applyHierarchy = (req, payload) => {
  const role = req.user.role;
  const roleType = req.user.roleType;

  if (role === "user") {
    payload.supervisorId = req.user.id;
    payload.supervisorModel = roleModelMap[roleType];
  }

  if (role === "worker") {
    payload.supervisorId = req.user.supervisor;
    payload.supervisorModel =
      roleModelMap[roleType] || req.user.supervisorModel;
  }

  if (role === "superadmin") {
    payload.supervisorId = payload.supervisorId;
    payload.supervisorModel = payload.supervisorModel;
  }

  return payload;
};

const buildFilter = (req) => {
  const role = req.user.role;
  const roleType = req.user.roleType;

  const filter = { isActive: true };

  if (role === "user") {
    filter.supervisorId = req.user.id;
    filter.supervisorModel = roleModelMap[roleType];
  }

  if (role === "worker") {
    filter.supervisorId = req.user.supervisor;
    filter.supervisorModel =
      roleModelMap[roleType] || req.user.supervisorModel;
  }

  if (role === "superadmin") {
    if (req.query.supervisorId) filter.supervisorId = req.query.supervisorId;
    if (req.query.supervisorModel) filter.supervisorModel = req.query.supervisorModel;
  }

  return filter;
};

exports.createZone = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const payload = applyHierarchy(req, { ...req.body });

    if (!payload.zoneName) {
      return res.status(400).json({ message: "zoneName is required" });
    }

    if (!payload.supervisorId) {
      return res.status(400).json({ message: "supervisorId is required" });
    }

    if (!payload.supervisorModel) {
      return res.status(400).json({ message: "supervisorModel is required" });
    }

    payload.createdBy = req.user.id;
    payload.createdByRole = req.user.role;

    const zone = await Zone.create(payload);

    return res.status(201).json({
      message: "Zone created successfully",
      zone,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error creating zone",
      error: error.message,
    });
  }
};

exports.getAllZones = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = buildFilter(req);

    if (req.query.search) {
      filter.zoneName = { $regex: req.query.search, $options: "i" };
    }

    const [zones, total] = await Promise.all([
      Zone.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Zone.countDocuments(filter),
    ]);

    return res.status(200).json({
      message: "Zones fetched successfully",
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      zones,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching zones",
      error: error.message,
    });
  }
};

exports.getZoneDropdown = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = buildFilter(req);

    if (req.query.search) {
      filter.zoneName = { $regex: req.query.search, $options: "i" };
    }

    const [zones, total] = await Promise.all([
      Zone.find(filter)
        .select("zoneName")
        .sort({ zoneName: 1 })
        .skip(skip)
        .limit(limit),

      Zone.countDocuments(filter),
    ]);

    return res.status(200).json({
      message: "Zone dropdown fetched successfully",
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      zones,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching zone dropdown",
      error: error.message,
    });
  }
};

exports.getZoneById = async (req, res) => {
  try {
    const filter = buildFilter(req);
    filter._id = req.params.id;

    const zone = await Zone.findOne(filter);

    if (!zone) {
      return res.status(404).json({ message: "Zone not found" });
    }

    return res.status(200).json({
      message: "Zone fetched successfully",
      zone,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching zone",
      error: error.message,
    });
  }
};

exports.updateZone = async (req, res) => {
  try {
    const filter = buildFilter(req);
    filter._id = req.params.id;

    const updateData = { ...req.body };

    delete updateData.supervisorId;
    delete updateData.supervisorModel;
    delete updateData.createdBy;
    delete updateData.createdByRole;
    delete updateData.isActive;

    const zone = await Zone.findOneAndUpdate(filter, updateData, { new: true });

    if (!zone) {
      return res.status(404).json({ message: "Zone not found" });
    }

    return res.status(200).json({
      message: "Zone updated successfully",
      zone,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error updating zone",
      error: error.message,
    });
  }
};

exports.deleteZone = async (req, res) => {
  try {
    const filter = buildFilter(req);
    filter._id = req.params.id;

    const zone = await Zone.findOneAndUpdate(
      filter,
      { isActive: false },
      { new: true }
    );

    if (!zone) {
      return res.status(404).json({ message: "Zone not found" });
    }

    return res.status(200).json({
      message: "Zone deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error deleting zone",
      error: error.message,
    });
  }
};