const Salary = require("../model/salaryModel");

exports.createSalary = async (req, res) => {
  try {
    if (req.user.role === "user") {
      const driverId = req.params.id;
      const { basicPay, overtime = 0, incentives = 0, deductions = 0, date } = req.body;

      if (!basicPay) return res.status(400).json({ message: "Basic pay is required." })

      const istOffset = 5.5 * 60 * 60 * 1000;
      const now = new Date(new Date().getTime() + istOffset);
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      const existingSalary = await Salary.findOne({
        driverId,
        date: date
      });

      if (existingSalary) return res.status(400).json({ message: "Salary slip for this month already exists." });

      const salary = new Salary({
        driverId,
        supervisorId: req.user.id,
        basicPay: Number(basicPay),
        overtime: Number(overtime),
        incentives: Number(incentives),
        deductions: Number(deductions),
        netPay: Number(basicPay) + Number(overtime) + Number(incentives) - Number(deductions),
        date:date
      });

      await salary.save();

      return res.status(201).json({ message: "Salary slip generated successfully", salary });

    } else {
      return res.status(403).json({ message: "Unauthorized access" });
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getDriverSalariesById = async (req, res) => {
  try {
    if (req.user.role === "superadmin" || req.user.role === "user") {
      const driverId = req.params.id;
      const salaries = await Salary.find({ driverId }).sort({ createdAt: 1 });
      if (!salaries.length) return res.status(404).json({ message: "No salary records found for this driver." });
      return res.status(200).json(salaries);

    } else if (req.user.role === "driver") {
      const driverId = req.user.id;
      const salaries = await Salary.find({ driverId }).sort({ createdAt: 1 });
      if (!salaries.length) return res.status(404).json({ message: "No salary records found for this driver." });
      return res.status(200).json(salaries);

    } else {
      return res.status(403).json({ message: "Unauthorized access" });
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.updateSalary = async (req, res) => {
  try {
    if (req.user.role === 'user') {
      const salaryId = req.params.id;
      const { basicPay, overtime, incentives, deductions, date } = req.body;

      if (basicPay === undefined && overtime === undefined && incentives === undefined && deductions === undefined) return res.status(400).json({ message: "At least one field must be updated" });

      const existingSalary = await Salary.findById(salaryId);
      if (!existingSalary) return res.status(404).json({ message: "Salary record not found" });

      const updatedSalary = await Salary.findByIdAndUpdate(
        salaryId,
        {
          basicPay: basicPay ? Number(basicPay) : existingSalary.basicPay,
          overtime: overtime ? Number(overtime) : existingSalary.overtime,
          incentives: incentives ? Number(incentives) : existingSalary.incentives,
          deductions: deductions ? Number(deductions) : existingSalary.deductions,
         date: date && date,
          netPay: (basicPay ? Number(basicPay) : existingSalary.basicPay) +
            (overtime ? Number(overtime) : existingSalary.overtime) +
            (incentives ? Number(incentives) : existingSalary.incentives) -
            (deductions ? Number(deductions) : existingSalary.deductions),
        },
        
        { new: true, runValidators: true }
      );
      return res.status(200).json(updatedSalary);

    } else {
      return res.status(403).json({ message: "Unauthorized access" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" + error.message });
  }
};

exports.deleteSalary = async (req, res) => {
  try {
    if (req.user.role === 'user') {
      const salaryId = req.params.id;
      const salary = await Salary.findByIdAndDelete(salaryId);
      if (!salary) return res.status(404).json({ message: "Salary record not found" });
      return res.status(200).json({ message: "Salary record deleted successfully" });

    } else {
      return res.status(403).json({ message: "Unauthorized access" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" + error.message });
  }
};

exports.getSalariesByMonth = async (req, res) => {
  try {
    const { month } = req.params; // Extracting month from URL (YYYY-MM)

    const startDate = new Date(`${month}-01T00:00:00.000Z`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    if (isNaN(startDate.getTime())) return res.status(400).json({ error: "Invalid month format. Use YYYY-MM." });

    const salaries = await Salary.find({
      supervisorId: req.user.id,
      date: { $gte: startDate, $lt: endDate },
    }).populate("driverId", "name contactNumber supervisor").select('-supervisorId -__v');

    if (salaries.length === 0) return res.status(404).json({ message: "No salary records found for this month." });

    return res.status(200).json(salaries);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server Error", details: error.message });
  }
};
