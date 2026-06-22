const mongoose = require("mongoose");
const DailyBuiltyProductList = require("../model/dailyBuiltyProductModel");
const Worker = require("../model/workerModel");
const Driver = require("../model/driverModel");

const getSupervisorData = async (req, allowDriver = false) => {
  const { role, id, roleType } = req.user;

  if (role === "user") {
    return {
      supervisorId: id,
      supervisorModel:
        req.user.supervisorModel ||
        req.user.supervisorType ||
        req.user.supervisorRole ||
        (roleType === "branch" ? "Branch" : roleType === "branchGroup" ? "BranchGroup" : "School"),
    };
  }

  if (role === "worker") {
    const worker = await Worker.findById(id)
      .select("supervisor supervisorModel supervisorType supervisorRole")
      .lean();

    if (!worker || !worker.supervisor) {
      throw new Error("Supervisor not assigned to worker");
    }

    return {
      supervisorId: worker.supervisor,
      supervisorModel:
        worker.supervisorModel ||
        worker.supervisorType ||
        worker.supervisorRole ||
        req.user.supervisorModel ||
        "School",
    };
  }

  if (role === "driver" && allowDriver) {
    const supervisorId = req.user.supervisor;

    if (!supervisorId) {
      throw new Error("Supervisor not assigned to driver");
    }

    return {
      supervisorId,
      supervisorModel:
        req.user.supervisorModel ||
        req.user.supervisorType ||
        req.user.supervisorRole ||
        "School",
    };
  }

  if (role === "superadmin") {
    return {
      supervisorId: req.body.supervisorId || req.query.supervisorId,
      supervisorModel: req.body.supervisorModel || req.query.supervisorModel,
    };
  }

  return null;
};

// CREATE
exports.createDailyBuiltyProduct = async (req, res) => {
  try {
    const { name, category, unit } = req.body;

    if (!["superadmin", "user"].includes(req.user.role)) {
      return res.status(403).json({ msg: "Unauthorized role" });
    }

    const supervisorData = await getSupervisorData(req);

    if (!supervisorData || !supervisorData.supervisorId || !supervisorData.supervisorModel) {
      return res.status(400).json({
        msg: "supervisorId and supervisorModel are required",
      });
    }

    const existing = await DailyBuiltyProductList.findOne({
      name,
      supervisorId: supervisorData.supervisorId,
      supervisorModel: supervisorData.supervisorModel,
    });

    if (existing) {
      return res.status(400).json({
        msg: "Daily builty product already exists for this supervisor",
      });
    }

    const newProduct = await DailyBuiltyProductList.create({
      name,
      category,
      unit,
      supervisorId: supervisorData.supervisorId,
      supervisorModel: supervisorData.supervisorModel,
    });

    return res.status(201).json({
      msg: "Daily builty product created successfully",
      data: newProduct,
    });
  } catch (err) {
    return res.status(500).json({
      msg: "Error creating daily builty product",
      error: err.message,
    });
  }
};

// GET ALL
exports.getDailyBuiltyProducts = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = Math.max(parseInt(page) || 1, 1);
    limit = Math.max(parseInt(limit) || 10, 1);

    const filter = {};

    const supervisorData = await getSupervisorData(req);

    if (!supervisorData && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Unauthorized role" });
    }

    if (req.user.role === "superadmin") {
      if (req.query.supervisorId) filter.supervisorId = req.query.supervisorId;
      if (req.query.supervisorModel) filter.supervisorModel = req.query.supervisorModel;
    } else {
      filter.supervisorId = supervisorData.supervisorId;
      filter.supervisorModel = supervisorData.supervisorModel;
    }

    if (search.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { category: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const total = await DailyBuiltyProductList.countDocuments(filter);

    const data = await DailyBuiltyProductList.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Error fetching daily builty products",
      error: err.message,
    });
  }
};

// GET BY ID
exports.getDailyBuiltyProductById = async (req, res) => {
  try {
    const filter = { _id: req.params.id };

    if (req.user.role === "superadmin") {
      // no restriction
    } else if (["user", "worker"].includes(req.user.role)) {
      const supervisorData = await getSupervisorData(req);

      filter.supervisorId = supervisorData.supervisorId;
      filter.supervisorModel = supervisorData.supervisorModel;
    } else {
      return res.status(403).json({ message: "Unauthorized role" });
    }

    const data = await DailyBuiltyProductList.findOne(filter);

    if (!data) {
      return res.status(404).json({
        msg: "Daily builty product not found or unauthorized",
      });
    }

    return res.status(200).json({ data });
  } catch (err) {
    return res.status(500).json({
      msg: "Error",
      error: err.message,
    });
  }
};

// UPDATE
exports.updateDailyBuiltyProduct = async (req, res) => {
  try {
    if (!["superadmin", "user"].includes(req.user.role)) {
      return res.status(403).json({
        message: "You are not authorized to update daily builty products",
      });
    }

    const filter = { _id: req.params.id };

    if (req.user.role === "user") {
      const supervisorData = await getSupervisorData(req);

      filter.supervisorId = supervisorData.supervisorId;
      filter.supervisorModel = supervisorData.supervisorModel;
    }

    delete req.body.supervisorId;
    delete req.body.supervisorModel;

    const updated = await DailyBuiltyProductList.findOneAndUpdate(
      filter,
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        message: "Daily builty product not found or unauthorized",
      });
    }

    return res.status(200).json({
      message: "Daily builty product updated successfully",
      data: updated,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Error updating daily builty product",
      error: err.message,
    });
  }
};

// DELETE
exports.deleteDailyBuiltyProduct = async (req, res) => {
  try {
    if (!["superadmin", "user"].includes(req.user.role)) {
      return res.status(403).json({
        message: "You are not authorized to delete daily builty products",
      });
    }

    const filter = { _id: req.params.id };

    if (req.user.role === "user") {
      const supervisorData = await getSupervisorData(req);

      filter.supervisorId = supervisorData.supervisorId;
      filter.supervisorModel = supervisorData.supervisorModel;
    }

    const deleted = await DailyBuiltyProductList.findOneAndDelete(filter);

    if (!deleted) {
      return res.status(404).json({
        message: "Daily builty product not found or unauthorized",
      });
    }

    return res.status(200).json({
      message: "Daily builty product deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Error deleting daily builty product",
      error: err.message,
    });
  }
};

// DROPDOWN
exports.getDailyBuiltyProductsForDropdown = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = Math.max(parseInt(page) || 1, 1);
    limit = Math.max(parseInt(limit) || 10, 1);

    const filter = {};

    const supervisorData = await getSupervisorData(req, true);

    if (!supervisorData && req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Unauthorized role" });
    }

    if (req.user.role === "superadmin") {
      if (req.query.supervisorId) filter.supervisorId = req.query.supervisorId;
      if (req.query.supervisorModel) filter.supervisorModel = req.query.supervisorModel;
    } else {
      filter.supervisorId = supervisorData.supervisorId;
      filter.supervisorModel = supervisorData.supervisorModel;
    }

    if (search.trim()) {
      filter.name = {
        $regex: search.trim(),
        $options: "i",
      };
    }

    const total = await DailyBuiltyProductList.countDocuments(filter);

    const data = await DailyBuiltyProductList.find(filter)
      .select("_id name category unit supervisorId supervisorModel")
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data,
    });
  } catch (err) {
    return res.status(500).json({
      msg: "Error fetching daily builty products dropdown with pagination",
      error: err.message,
    });
  }
};