const { Report_distance } = require("../model/reportDistanceModel");
const Device = require("../model/deviceModel")
const vehicleExpenses = require("../model/vehicleExpensesModel")


exports.getData = async (req, res) => {
    try {
        if (req.user.role !== "driver" && req.user.role !== "user" && req.user.role !== "superadmin") return res.status(403).json({ success: false, message: "Unauthorized access" });

        const deviceData = await Device.findById(req.params.id).lean();
        if (!deviceData) return res.status(404).json({ success: false, message: "Device not found" });
        const deviceID = deviceData.deviceId;

        // Parse month query parameter (format: YYYY-MM)
        const { month } = req.query;
        let dateFilter = {};
        if (month) {
            // Validate month format (YYYY-MM)
            const monthRegex = /^\d{4}-\d{2}$/;
            if (!monthRegex.test(month)) return res.status(400).json({ success: false, message: "Invalid month format. Use YYYY-MM" });

            const [year, monthNum] = month.split("-").map(Number);
            if (isNaN(year) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) return res.status(400).json({ success: false, message: "Invalid year or month. Use YYYY-MM with valid values" });

            // Create start and end dates in UTC
            const startOfMonth = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
            const endOfMonth = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));

            // Verify dates are valid
            if (isNaN(startOfMonth.getTime()) || isNaN(endOfMonth.getTime())) return res.status(400).json({ success: false, message: "Invalid date range" });
            dateFilter = { $gte: startOfMonth, $lte: endOfMonth };
        }

        // Fetch distance data with month filter
        const uniqueId = Number(deviceData.uniqueId);

        const distancedata = await Report_distance.find({
        uniqueId,
        ...(month ? { createdAt: dateFilter } : {})
        }).lean();
        // Fetch fuel expenses with month filter
        let fuelExpenses = [];
        if (deviceData && deviceData._id) {
            fuelExpenses = await vehicleExpenses.find({
                vehicleId: deviceData._id,
                expenseType: 'fuel',
                ...(month ? { date: dateFilter } : {})
            }).select('amount date').lean();
        }

        // Get average fuel efficiency
        const averageFuelEfficiency = deviceData ? deviceData.average : null;

        // Merge fuelExpenses into distancedata and calculate daily fuel consumption
        const mergedData = distancedata.map(distanceItem => {
            const matchingFuelExpenses = fuelExpenses.filter(expense => {
                // Validate dates before comparison
                if (!distanceItem.createdAt || !expense.date) return false;
                const distanceDate = new Date(distanceItem.createdAt);
                const expenseDate = new Date(expense.date);
                if (isNaN(distanceDate.getTime()) || isNaN(expenseDate.getTime())) {
                    console.warn("Invalid date detected:", { distanceDate: distanceItem.createdAt, expenseDate: expense.date });
                    return false;
                }
                return distanceDate.toISOString().split('T')[0] === expenseDate.toISOString().split('T')[0];
            });

            // Calculate daily fuel consumption
            let dailyFuelConsumption = null;
            if (averageFuelEfficiency && averageFuelEfficiency > 0 && distanceItem.distance) dailyFuelConsumption = Number((distanceItem.distance / averageFuelEfficiency).toFixed(2));

            return {
                ...distanceItem,
                fuelExpenses: matchingFuelExpenses.length > 0 ? matchingFuelExpenses : [],
                dailyFuelConsumption, // Add daily fuel consumption
            };
        });

        // Calculate totals
        const totalDistance = Number(distancedata.reduce((sum, item) => sum + (item.distance || 0), 0).toFixed(2));
        const totalFuelExpense = Number(fuelExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0).toFixed(2));

        let totalFuelConsumption = null;
        if (averageFuelEfficiency && averageFuelEfficiency > 0) {
            totalFuelConsumption = totalDistance / averageFuelEfficiency; // in liters
            totalFuelConsumption = Number(totalFuelConsumption.toFixed(2)); // Round to 2 decimals
        }

        return res.json({
            success: true,
            message: "Data fetched successfully",
            name: deviceData.name,
            averageFuelEfficiency,
            distancedata: mergedData,
            totalDistance,
            totalFuelConsumption,
            totalFuelExpense,
            month: month || "all"
        });
    } catch (error) {
        console.error("Error fetching data:", error.message);
        return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};