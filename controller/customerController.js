const Customer = require("../model/customerModel");
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

exports.createCustomer = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const payload = applyHierarchy(req, { ...req.body });

    if (!payload.customerName) {
      return res.status(400).json({ message: "customerName is required" });
    }

    if (!payload.mobileNumber) {
      return res.status(400).json({ message: "mobileNumber is required" });
    }

    if (!payload.zoneId) {
      return res.status(400).json({ message: "zoneId is required" });
    }

    if (!payload.supervisorId) {
      return res.status(400).json({ message: "supervisorId is required" });
    }

    if (!payload.supervisorModel) {
      return res.status(400).json({ message: "supervisorModel is required" });
    }

    const zone = await Zone.findOne({
      _id: payload.zoneId,
      supervisorId: payload.supervisorId,
      supervisorModel: payload.supervisorModel,
      isActive: true,
    });

    if (!zone) {
      return res.status(404).json({ message: "Zone not found" });
    }

    payload.createdBy = req.user.id;
    payload.createdByRole = req.user.role;

    const customer = await Customer.create(payload);

    return res.status(201).json({
      message: "Customer created successfully",
      customer,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error creating customer",
      error: error.message,
    });
  }
};

exports.getAllCustomers = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = buildFilter(req);

    if (req.query.zoneId) {
      filter.zoneId = req.query.zoneId;
    }

    if (req.query.search) {
      filter.$or = [
        { customerName: { $regex: req.query.search, $options: "i" } },
        { mobileNumber: { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
        { gstNumber: { $regex: req.query.search, $options: "i" } },
        { address: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .populate("zoneId", "zoneName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Customer.countDocuments(filter),
    ]);

    return res.status(200).json({
      message: "Customers fetched successfully",
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      customers,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching customers",
      error: error.message,
    });
  }
};

exports.getCustomerDropdown = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = buildFilter(req);

    if (req.query.zoneId) {
      filter.zoneId = req.query.zoneId;
    }

    if (req.query.search) {
      filter.$or = [
        { customerName: { $regex: req.query.search, $options: "i" } },
        { mobileNumber: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .select("customerName mobileNumber zoneId")
        .populate("zoneId", "zoneName")
        .sort({ customerName: 1 })
        .skip(skip)
        .limit(limit),

      Customer.countDocuments(filter),
    ]);

    return res.status(200).json({
      message: "Customer dropdown fetched successfully",
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      customers,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching customer dropdown",
      error: error.message,
    });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const filter = buildFilter(req);
    filter._id = req.params.id;

    const customer = await Customer.findOne(filter).populate("zoneId", "zoneName");

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    return res.status(200).json({
      message: "Customer fetched successfully",
      customer,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching customer",
      error: error.message,
    });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const filter = buildFilter(req);
    filter._id = req.params.id;

    const oldCustomer = await Customer.findOne(filter);

    if (!oldCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const updateData = { ...req.body };

    delete updateData.supervisorId;
    delete updateData.supervisorModel;
    delete updateData.createdBy;
    delete updateData.createdByRole;
    delete updateData.isActive;

    if (updateData.zoneId) {
      const zone = await Zone.findOne({
        _id: updateData.zoneId,
        supervisorId: oldCustomer.supervisorId,
        supervisorModel: oldCustomer.supervisorModel,
        isActive: true,
      });

      if (!zone) {
        return res.status(404).json({ message: "Zone not found" });
      }
    }

    const customer = await Customer.findOneAndUpdate(filter, updateData, {
      new: true,
    }).populate("zoneId", "zoneName");

    return res.status(200).json({
      message: "Customer updated successfully",
      customer,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error updating customer",
      error: error.message,
    });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const filter = buildFilter(req);
    filter._id = req.params.id;

    const customer = await Customer.findOneAndUpdate(
      filter,
      { isActive: false },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    return res.status(200).json({
      message: "Customer deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error deleting customer",
      error: error.message,
    });
  }
};