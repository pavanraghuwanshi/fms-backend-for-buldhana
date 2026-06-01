const { default: mongoose } = require("mongoose");
const LorryReceipt = require("../model/lorryReceiptModel");

exports.createLorryReceipt = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker"].includes(req.user.role)) return res.status(403).json({ message: "You are not authorized to create a lorry receipt" });
    const payload = req.body;
    if (!mongoose.Types.ObjectId.isValid(payload.driverId)) {
      payload.driverId = undefined;
    }
    if (!mongoose.Types.ObjectId.isValid(payload.vehicleId)) {
      payload.vehicleId = undefined;
    }

    if (req.user.role === "user") {
      payload.supervisorId = req.user.id;
      payload.supervisorName = req.user.username;
    }
    if (req.user.role === "worker") {
      payload.workerId = req.user.id;
      payload.supervisorId = req.user.supervisor;
      payload.supervisorName = req.user.supervisorName;
    }
    if (!payload.supervisorId) return res.status(400).json({ message: "SupervisorId is required" });
    if (!payload.workerId) return res.status(400).json({ message: "workerId is required" });
    if (!payload.companyId) return res.status(400).json({ message: "companyId is required" });

    const newReceipt = new LorryReceipt(payload);
    await newReceipt.save();
    return res.status(201).json(newReceipt);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getAllLorryReceipts = async (req, res) => {
  try {
    let filter = {};
    if (!["superadmin", "user", "worker"].includes(req.user.role)) return res.status(403).json({ message: "You are not authorized to view lorry receipts" });
    if (req.user.role === "superadmin") {
      const { supervisorId } = req.query;
      if (supervisorId) filter.supervisorId = supervisorId
    }
    else if (req.user.role === "user") filter.supervisorId = req.user.id;
    else if (req.user.role === "worker") filter.workerId = req.user.id;

    const receipts = await LorryReceipt.find(filter).populate('workerId', 'name phone supervisor').populate('driverId', 'contactNumber').populate('companyId', 'companyName address mobileNumber officeNumber email gstNumber digitalSignatureId');
    if (receipts.length === 0) return res.status(404).json({ message: "No receipts found" });
    return res.status(200).json(receipts);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getLorryReceiptById = async (req, res) => {
  try {
    const receipt = await LorryReceipt.findById(req.params.id).populate('workerId', 'name phone').populate('driverId', 'contactNumber').populate('companyId', 'companyName address mobileNumber officeNumber email gstNumber digitalSignatureId');
    if (!receipt) return res.status(404).json({ message: "Receipt not found" });
    return res.status(200).json(receipt);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.updateLorryReceipt = async (req, res) => {
  try {
    const updatedReceipt = await LorryReceipt.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedReceipt) return res.status(404).json({ message: "Receipt not found" });
    return res.status(200).json(updatedReceipt);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.deleteLorryReceipt = async (req, res) => {
  try {
    const deletedReceipt = await LorryReceipt.findByIdAndDelete(req.params.id);
    if (!deletedReceipt) return res.status(404).json({ message: "Receipt not found" });
    return res.status(200).json({ message: "Receipt deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
