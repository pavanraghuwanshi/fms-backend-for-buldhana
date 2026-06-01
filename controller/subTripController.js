const Driver = require("../model/driverModel");
const Subtrip = require("../model/subTripModel");
const Trip = require("../model/tripModel");

// exports.createSubtrip = async (req, res) => {
//     try {

//         if (req.user.role !== "driver" && req.user.role !== "user") {
//             return res.status(403).json({ success: false, message: "Unauthorized access" });
//         }

//         let driverId;
//         const { startLocation, endLocation, date, budgetAllocated, companyName, materialType, startLatitude, startLongitude } = req.body;

//         if (req.user.role === "driver") {
//             driverId = req.user.id;
//         } else if (req.user.role === "user") {
//             driverId = req.body.driverId;
//         }

//         if (!driverId) {
//             return res.status(400).json({ message: "Driver ID is required" });
//         }

//         const driver = await Driver.findById(driverId).select('-_id currentTripId');
//         if (!driver || !driver.currentTripId) {
//             return res.status(400).json({ message: "Driver not found or no trip assigned to the driver" });
//         }

//         const subtrip = new Subtrip({
//             tripId: driver.currentTripId,
//             startLocation,
//             endLocation,
//             date,
//             budgetAllocated,
//             companyName,
//             materialType,
//             startLatitude,
//             startLongitude,
//         });

//         await subtrip.save();
//         return res.status(201).json({ success: true, message: "Subtrip created", subtrip });
//     } catch (error) {
//         return res.status(500).json({ success: false, message: "Failed to create subtrip", error: error.message });
//     }
// };
exports.createSubtrip = async (req, res) => {
    try {
        // Check if the user has a driver or user role
        if (req.user.role !== "driver" && req.user.role !== "user") {
            return res.status(403).json({ success: false, message: "Unauthorized access" });
        }

        let driverId, tripId;
        const { startLocation, endLocation, date, budgetAllocated, companyName, materialType, startLatitude, startLongitude } = req.body;

        // Determine driverId and tripId based on user role
        if (req.user.role === "driver") {
            driverId = req.user.id;
            const driver = await Driver.findById(driverId).select('currentTripId');
            if (!driver || !driver.currentTripId) {
                return res.status(400).json({ message: "Driver not found or no trip assigned to the driver" });
            }
            tripId = driver.currentTripId;
        } else if (req.user.role === "user") {
            tripId = req.query.tripId;
        }

        if (!tripId) {
            return res.status(400).json({ message: "Trip ID is required" });
        }

        // Verify the driver exists
        const driver = await Driver.find({ currentTripId: tripId });
        if (!driver) {
            return res.status(400).json({ message: "Driver not found" });
        }

        // For users, verify the trip belongs to the driver
        if (req.user.role === "user") {
            const trip = await Trip.findById(tripId);
            if (!trip) {
                return res.status(400).json({ message: "Trip not found or does not belong to the specified driver" });
            }
        }

        const subtrip = new Subtrip({
            tripId,
            startLocation,
            endLocation,
            date,
            budgetAllocated,
            companyName,
            materialType,
            startLatitude,
            startLongitude,
        });

        await subtrip.save();
        return res.status(201).json({ success: true, message: "Subtrip created", subtrip });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Failed to create subtrip", error: error.message });
    }
};
exports.getSubtripByTripId = async (req, res) => {
    try {
        const subtrip = await Subtrip.find({ tripId: req.params.id }).select('-__v -tripId').sort({ createdAt: -1 });
        if (!subtrip.length) return res.status(404).json({ success: false, message: "Subtrip not found" });
        return res.status(200).json({ success: true, subtrip });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error fetching subtrip", error: error.message });
    }
};

exports.updateSubtrip = async (req, res) => {
    try {
        if (req.user.role !== "driver" && req.user.role !== "user") return res.status(403).json({ success: false, message: "Unauthorized access" });
        const { startLocation, endLocation, date, budgetAllocated, companyName, materialType, status, endLatitude, endLongitude } = req.body;

        const subtrip = await Subtrip.findById(req.params.id).populate("tripId", "driverId");
        if (!subtrip) return res.status(404).json({ message: "Subtrip not found" });
        if (subtrip.status !== "in-progress") return res.status(400).json({ message: `Subtrip is ${subtrip.status} and cannot be updated` });

        if (status) {
            await Subtrip.findByIdAndUpdate(req.params.id, { status, endLatitude, endLongitude });
            return res.status(200).json({ message: "Trip status updated successfully" });
        }

        if (startLocation) subtrip.startLocation = startLocation;
        if (endLocation) subtrip.endLocation = endLocation;
        if (date) subtrip.date = date;
        if (budgetAllocated !== undefined) subtrip.budgetAllocated = budgetAllocated;
        if (companyName) subtrip.companyName = companyName;
        if (materialType) subtrip.materialType = materialType;

        await subtrip.save();
        return res.status(200).json({ success: true, message: "Subtrip updated", subtrip });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update subtrip", error: error.message });
    }
};

exports.deleteSubtrip = async (req, res) => {
    try {
        const deleted = await Subtrip.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, message: "Subtrip not found" });
        return res.status(200).json({ success: true, message: "Subtrip deleted successfully" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete subtrip", error: error.message });
    }
};
