const LeaveRequest = require("../model/leaveModel");
const Driver = require("../model/driverModel");
const Attendance = require("../model/attendanceModel");

exports.applyLeaveByDriver = async (req, res) => {
  try {
    const { startDate, endDate, description } = req.body;
    const driverId = req.user.id;

    if (!startDate || !endDate) return res.status(400).json({ error: "All fields are required" });
    if (new Date(startDate) > new Date(endDate)) return res.status(400).json({ error: "Start date cannot be later than end date" });

    const overlappingLeave = await LeaveRequest.findOne({
      driverId,
      $or: [
        {
          startDate: { $lte: new Date(endDate) },
          endDate: { $gte: new Date(startDate) },
        },
      ],
      status: { $ne: "Rejected" },
    });

    if (overlappingLeave) {
      return res.status(400).json({ error: "You already have a leave request overlapping with this period." });
    }

    const leave = new LeaveRequest({
      driverId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      description,
    });
    await leave.save();
    return res.status(201).json({ message: "Leave request submitted", leave });
  } catch (error) {
    return res.status(500).json({ error: "Failed to submit leave request" + error.message });
  }
};

exports.getLeaves = async (req, res) => {
  try {
    if (req.user.role === "superadmin") {
      const leaves = await LeaveRequest.find().populate("driverId", "name").select("driverId startDate endDate description status ");
      return res.status(200).json(leaves);
    } else if (req.user.role === "user") {
      const drivers = await Driver.find({
        supervisor: req.user.id,
      }).select("_id");
      if (drivers.length === 0) {
        return res.status(404).json({ message: "No driver found." });
      }
      const leaves = await LeaveRequest.find({ driverId: { $in: drivers } }).populate("driverId", "name").select("driverId startDate endDate description status ");
      return res.status(200).json(leaves);
    } else {
      const leaves = await LeaveRequest.find({ driverId: req.user.id });
      return res.status(200).json(leaves);
    }
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch leave requests" + error.message });
  }
};

exports.getPendingLeaveByDriverId = async (req, res) => {
  try {
    if (req.user.role === "user") {
      const driverId = req.params.driverId;
      const leaves = await LeaveRequest.find({ driverId, status: "Pending" }).populate("driverId", "name").select("driverId startDate endDate description status ");
      if (leaves.length === 0) {
        return res.status(404).json({ message: "No leave requests found for this driver" });
      }
      return res.status(200).json(leaves);
    }
    else {
      return res.status(403).json({ message: "Unauthorized access" });
    }
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch leave requests" + error.message });
  }
}
exports.getPendingLeaveForDriver = async (req, res) => {
  try {
    if (req.user.role !== "driver" && req.user.role !== "user") {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    let driverId;
    if (req.user.role === "driver") {
      driverId = req.user.id;
    } 

    const { month } = req.query;
    let dateFilter = {};
    if (month) {
      const [year, monthNum] = month.split("-").map(Number);
      if (!year || !monthNum || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({ success: false, message: "Invalid month format. Use YYYY-MM" });
      }
      const startOfMonth = new Date(year, monthNum - 1, 1);
      const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999);
      dateFilter = { startDate: { $gte: startOfMonth, $lte: endOfMonth } };
    }

    const leaves = await LeaveRequest.find({
      driverId,
      status: "Pending",
      ...dateFilter
    })
      .populate("driverId", "name")
      .select("driverId startDate endDate description status")
      .lean();

    if (leaves.length === 0) {
      return res.status(404).json({ success: false, message: "No pending leave requests found" });
    }

    return res.status(200).json({
      success: true,
      message: "Pending leave requests fetched successfully",
      leaves,
      month: month || "all"
    });
  } catch (error) {
    console.error("Error fetching leave requests:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch leave requests", error: error.message });
  }
};

exports.getApprovedOrRejectedRequestForDriver = async (req, res) => {
  try {
    if (req.user.role !== "driver" && req.user.role !== "user") {
      return res.status(403).json({ success: false, message: "Unauthorized access" });
    }

    let driverId;
    if (req.user.role === "driver") {
      driverId = req.user.id;
    } else {
      driverId = req.params.driverId;
      if (!driverId) {
        return res.status(400).json({ success: false, message: "Driver ID is required" });
      }
    }

    const { month } = req.query;
    let dateFilter = {};
    if (month) {
      const [year, monthNum] = month.split("-").map(Number);
      if (!year || !monthNum || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({ success: false, message: "Invalid month format. Use YYYY-MM" });
      }
      const startOfMonth = new Date(year, monthNum - 1, 1);
      const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999);
      dateFilter = { startDate: { $gte: startOfMonth, $lte: endOfMonth } };
    }

    const leaves = await LeaveRequest.find({
      driverId,
      status: { $in: ["Approved", "Rejected"] },
      ...dateFilter
    })
      .populate("driverId", "name")
      .select("driverId startDate endDate description status")
      .lean();

    if (leaves.length === 0) {
      return res.status(404).json({ success: false, message: "No approved or rejected leave requests found" });
    }

    return res.status(200).json({
      success: true,
      message: "Approved and rejected leave requests fetched successfully",
      leaves,
      month: month || "all"
    });
  } catch (error) {
    console.error("Error fetching leave requests:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch leave requests", error: error.message });
  }
};

exports.getLeavesForApproval = async (req, res) => {
  try {
    if (req.user.role === "superadmin") {
      const leaves = await LeaveRequest.find({ status: "Pending" }).populate("driverId", "name").select("driverId startDate endDate description status ");
      return res.status(200).json(leaves);
    } else if (req.user.role === "user") {
      const drivers = await Driver.find({
        supervisor: req.user.id,
      }).select("_id");
      if (drivers.length === 0) {
        return res.status(404).json({ message: "No driver found." });
      }
      const leaves = await LeaveRequest.find({ driverId: { $in: drivers }, status: "Pending" }).populate("driverId", "name").select("driverId startDate endDate description status ");
      return res.status(200).json(leaves);
    } else {
      return res.status(403).json({ message: "Unauthorized access" });
    }
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch leave requests" + error.message });
  }
};


exports.updateLeave = async (req, res) => {

  const leaveId = req.params.leaveId;
  const role = req.user.role;
  try {
    if (role === "user") {
      const { status } = req.body;
      const leave = await LeaveRequest.findByIdAndUpdate(
        leaveId,
        { status },
        { new: true }
      );

      if (status === "Approved") {
        const { startDate, endDate, driverId } = leave;

        if (!startDate || !endDate || !driverId) {
          return res.status(400).json({ message: "Missing leave details." });
        }

        let attendanceRecords = [];
        let currentDate = new Date(startDate);
        const finalDate = new Date(endDate);

        while (currentDate <= finalDate) {
          attendanceRecords.push({
            driverId,
            status: "On Leave",
            createdAt: new Date(currentDate),
          });

          currentDate.setDate(currentDate.getDate() + 1);
        }

        await Attendance.insertMany(attendanceRecords);
      }

      return res.status(200).json({ message: `Leave request ${status.toLowerCase()}`, leave });
    }
    if (role === "driver") {
      const { startDate, endDate, description } = req.body;
      const leaveRequest = await LeaveRequest.findById(leaveId);

      if (!leaveRequest) return res.status(404).json({ message: "Leave request not found." });
      if (leaveRequest.status !== "Pending") return res.status(400).json({ message: "You Can't update now your leave has been " + leaveRequest.status, });

      if (startDate) leaveRequest.startDate = new Date(startDate);
      if (endDate) leaveRequest.endDate = new Date(startDate);
      if (description) leaveRequest.description = description;

      await leaveRequest.save();
      return res.status(200).json({ message: "Leave request updated successfully.", leaveRequest });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred while updating the leave request." + error.message });
  }
};

exports.deleteLeave = async (req, res) => {
  try {
    const leaveId = req.params.leaveId;
    const role = req.user.role;

    if (role === "user") {
      const leaveRequest = await LeaveRequest.findById(leaveId);
      if (!leaveRequest) return res.status(404).json({ message: "Leave request not found" });

      await LeaveRequest.findByIdAndDelete(leaveId);
      return res.status(200).json({ message: "Leave request deleted successfully" });
    }

    if (role === "driver") {
      const leaveRequest = await LeaveRequest.findById(leaveId);
      if (!leaveRequest) {
        return res.status(404).json({ message: "Leave request not found" });
      }
      if (leaveRequest.status !== "Pending") return res.status(400).json({ message: "Only pending leave requests can be deleted" });

      await LeaveRequest.findByIdAndDelete(leaveId);
      return res.status(200).json({ message: "Leave request deleted successfully" });
    }
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete leave request" + error.message });
  }
};
