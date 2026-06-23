const Location = require("../model/location");


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
    payload.workerId = req.user.id;
    payload.supervisorId = req.user.supervisor;
    payload.supervisorModel = roleModelMap[roleType] || req.user.supervisorModel;
  }

  return payload;
};



// CREATE
exports.createLocation = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const payload = applyHierarchy(req, req.body);

    if (!payload.supervisorId) {
      return res.status(400).json({ message: "supervisorId is required" });
    }

    if (!payload.supervisorModel) {
      return res.status(400).json({ message: "supervisorModel is required" });
    }

    if (!payload.locationName) {
      return res.status(400).json({ message: "locationName is required" });
    }

    payload.locationName = payload.locationName.trim();
    payload.createdBy = req.user.id;
    payload.createdByRole = req.user.role;

    const exists = await Location.findOne({
      locationName: { $regex: `^${payload.locationName}$`, $options: "i" },
      supervisorId: payload.supervisorId,
      supervisorModel: payload.supervisorModel,
    });

    if (exists) {
      return res.status(400).json({ message: "Location already exists" });
    }

    const location = await Location.create(payload);

    return res.status(201).json({
      message: "Location created successfully",
      location,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error creating location",
      error: error.message,
    });
  }
};

// GET ALL WITH PAGINATION
exports.getLocations = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { page = 1, limit = 10, search, status, supervisorId } = req.query;

    const query = {};

    if (req.user.role === "user") {
      query.supervisorId = req.user.id;
    } else if (req.user.role === "worker") {
      query.supervisorId = req.user.supervisor;
    } else if (supervisorId) {
      query.supervisorId = supervisorId;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.locationName = { $regex: search, $options: "i" };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [locations, total] = await Promise.all([
      Location.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Location.countDocuments(query),
    ]);

    return res.status(200).json({
      message: "Locations fetched successfully",
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
      locations,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching locations",
      error: error.message,
    });
  }
};

// GET BY ID
exports.getLocationById = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = { _id: req.params.id };

    if (req.user.role === "user") {
      query.supervisorId = req.user.id;
    } else if (req.user.role === "worker") {
      query.supervisorId = req.user.supervisor;
    }

    const location = await Location.findOne(query);

    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }

    return res.status(200).json({
      message: "Location fetched successfully",
      location,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching location",
      error: error.message,
    });
  }
};

// UPDATE
exports.updateLocation = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = { _id: req.params.id };

    if (req.user.role === "user") {
      query.supervisorId = req.user.id;
    } else if (req.user.role === "worker") {
      query.supervisorId = req.user.supervisor;
    }

    const location = await Location.findOne(query);

    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }

    const { locationName, latitude, longitude, status } = req.body;

    if (locationName) location.locationName = locationName.trim();
    if (latitude !== undefined) location.latitude = latitude;
    if (longitude !== undefined) location.longitude = longitude;
    if (status) location.status = status;

    await location.save();

    return res.status(200).json({
      message: "Location updated successfully",
      location,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error updating location",
      error: error.message,
    });
  }
};

// DELETE
exports.deleteLocation = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = { _id: req.params.id };

    if (req.user.role === "user") {
      query.supervisorId = req.user.id;
    } else if (req.user.role === "worker") {
      query.supervisorId = req.user.supervisor;
    }

    const location = await Location.findOneAndDelete(query);

    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }

    return res.status(200).json({
      message: "Location deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error deleting location",
      error: error.message,
    });
  }
};

// DROPDOWN
exports.getLocationDropdown = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker", "driver"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { search, supervisorId } = req.query;

    const query = { status: "Active" };

    if (req.user.role === "user") {
      query.supervisorId = req.user.id;
    } else if (
      req.user.role === "worker" ||
      req.user.role === "driver"
    ) {
      query.supervisorId = req.user.supervisor;
    } else if (supervisorId) {
      query.supervisorId = supervisorId;
    }

    if (search) {
      query.locationName = { $regex: search, $options: "i" };
    }

    const locations = await Location.find(query)
      .select("_id locationName latitude longitude")
      .sort({ locationName: 1 });

    return res.status(200).json({
      message: "Location dropdown fetched successfully",
      locations,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching location dropdown",
      error: error.message,
    });
  }
};