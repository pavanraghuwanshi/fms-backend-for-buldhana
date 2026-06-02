const CommissionAgent = require("../model/commissionAgentModel");



exports.createCommissionAgent = async (req, res) => {
  try {
    const role = req.user.role;
    const roleType = req.user.roleType;

    if (!["superadmin", "user"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const roleModelMap = {
      school: "School",
      branch: "Branch",
      branchGroup: "BranchGroup",
    };

    if (
      roleType === "school" ||
      roleType === "branch" ||
      roleType === "branchGroup"
    ) {
      req.body.supervisorId = req.user.id;
      req.body.supervisorModel = roleModelMap[roleType];
    }

    if (!req.body.supervisorId) {
      return res.status(400).json({ message: "supervisorId is required" });
    }

    if (!req.body.supervisorModel) {
      return res.status(400).json({ message: "supervisorModel is required" });
    }

    const {
      agentName,
      contactPerson,
      contactNumber,
      email,
      address,
      gstNumber,
      panNumber,
      transporterId,
      supervisorId,
      supervisorModel,
      status,
    } = req.body;

    if (!agentName) {
      return res.status(400).json({
        message: "agentName is required",
      });
    }

    const existingAgent = await CommissionAgent.findOne({
      agentName,
      supervisorId,
      supervisorModel,
      transporterId: transporterId || null,
    });

    if (existingAgent) {
      return res.status(400).json({
        message: "Commission agent with this name already exists",
      });
    }

    const agent = await CommissionAgent.create({
      agentName,
      contactPerson,
      contactNumber,
      email,
      address,
      gstNumber,
      panNumber,
      transporterId: transporterId || null,
      agentSide: transporterId ? "transporter" : "our",
      supervisorId,
      supervisorModel,
      status,
    });

    return res.status(201).json({
      message: "Commission agent created successfully",
      agent,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error creating commission agent",
      error: error.message,
    });
  }
};

exports.getCommissionAgents = async (req, res) => {
  try {
    const role = req.user.role;

    if (!["superadmin", "user"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const {
      page = 1,
      limit = 10,
      search,
      status,
      transporterId,
      agentSide,
    } = req.query;

    const query = {};

    if (role === "user") {
      query.supervisorId = req.user.id;
    } else if (req.query.supervisorId) {
      query.supervisorId = req.query.supervisorId;
    }

    if (status) query.status = status;
    if (agentSide) query.agentSide = agentSide;

    if (transporterId) {
      query.transporterId = transporterId;
    }

    if (search) {
      query.$or = [
        { agentName: { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } },
        { contactNumber: { $regex: search, $options: "i" } },
        { gstNumber: { $regex: search, $options: "i" } },
        { panNumber: { $regex: search, $options: "i" } },
      ];
    }

    const agents = await CommissionAgent.find(query)
      .populate("transporterId"," transporterName")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await CommissionAgent.countDocuments(query);

    return res.status(200).json({
      message: "Commission agents fetched successfully",
      total,
      page: Number(page),
      limit: Number(limit),
      agents,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching commission agents",
      error: error.message,
    });
  }
};

exports.getCommissionAgentById = async (req, res) => {
  try {
    const role = req.user.role;

    if (!["superadmin", "user"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = { _id: req.params.id };

    if (role === "user") {
      query.supervisorId = req.user.id;
    }

    const agent = await CommissionAgent.findOne(query)
      .populate("transporterId")
      .populate("supervisorId", "name email mobile");

    if (!agent) {
      return res.status(404).json({ message: "Commission agent not found" });
    }

    return res.status(200).json({
      message: "Commission agent fetched successfully",
      agent,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching commission agent",
      error: error.message,
    });
  }
};

exports.updateCommissionAgent = async (req, res) => {
  try {
    const role = req.user.role;

    if (!["superadmin", "user"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = { _id: req.params.id };

    if (role === "user") {
      query.supervisorId = req.user.id;
      req.body.supervisorId = req.user.id;
    }

    if (req.body.transporterId === "") {
      req.body.transporterId = null;
    }

    if (req.body.transporterId === null || req.body.transporterId === undefined) {
      req.body.agentSide = "our";
    } else {
      req.body.agentSide = "transporter";
    }

    if (req.body.agentName) {
      const existingAgent = await CommissionAgent.findOne({
        agentName: req.body.agentName,
        _id: { $ne: req.params.id },
        transporterId: req.body.transporterId || null,
        supervisorId:
          role === "user"
            ? req.user.id
            : req.body.supervisorId || req.query.supervisorId,
      });

      if (existingAgent) {
        return res.status(400).json({
          message: "Commission agent with this name already exists",
        });
      }
    }

    const agent = await CommissionAgent.findOneAndUpdate(query, req.body, {
      new: true,
    });

    if (!agent) {
      return res.status(404).json({ message: "Commission agent not found" });
    }

    return res.status(200).json({
      message: "Commission agent updated successfully",
      agent,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error updating commission agent",
      error: error.message,
    });
  }
};

exports.deleteCommissionAgent = async (req, res) => {
  try {
    const role = req.user.role;

    if (!["superadmin", "user"].includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const query = { _id: req.params.id };

    if (role === "user") {
      query.supervisorId = req.user.id;
    }

    const agent = await CommissionAgent.findOneAndDelete(query);

    if (!agent) {
      return res.status(404).json({ message: "Commission agent not found" });
    }

    return res.status(200).json({
      message: "Commission agent deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error deleting commission agent",
      error: error.message,
    });
  }
};