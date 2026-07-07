const Tire = require("../model/tyre.js");
const Driver = require("../model/driverModel.js");
const Trip = require("../model/tripModel.js");
const { compressImage } = require("../utils/helperFunctions.js");
const Vehicleexpense = require("../model/vehicleExpensesModel.js");
const VehicleExpenseImage = require("../model/vehicleExpenseImageModel.js");
const VehicleMaster = require("../model/maintenanceDevice.model.js");

exports.addTire = async (req, res) => {
     try {
          if (req.user.role !== "driver" && req.user.role !== "user" && req.user.role !== "superadmin") return res.status(403).json({ success: false, message: "Unauthorized access" });
          const { vehicleId, position, tyreSerialNumber, brandName, tyreStatus, installationDate, vendorName, location, lat, long, tyreSize, amount, paymentMode } = req.body;
          if (!vehicleId) return res.status(400).json({ message: "Vehicle ID is required" });

          let driver = null;
          let vehicle = null;
          if (req.user.role === "driver") {
          driver = await Driver.findById(req.user.id).select("deviceId currentTripId").lean();

          if (!driver || !driver.deviceId || String(driver.deviceId) !== String(vehicleId)) {
          return res.status(400).json({
               message: "Vehicle not assigned to this driver",
          });
          }
          } else {
          driver = await Driver.findOne({ deviceId: vehicleId })
          .select("currentTripId deviceId")
          .lean();

          if (!driver) {
          return res.status(400).json({
               success: false,
               message: "No driver assigned to this vehicle",
          });
          }
          }

          vehicle = await VehicleMaster.findById(vehicleId)
               .select("vehicleNumber categoryId")
               .populate("categoryId", "categoryName")
               .lean();
          if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });

          const billImg = req.files?.["billImg"]?.[0];
          let billImgId = null;

          if (billImg) {
               const { base64Data, contentType } = await compressImage(billImg);
               const imgDoc = new VehicleExpenseImage({ base64Data, contentType });
               await imgDoc.save();
               billImgId = imgDoc._id;
          }

          const expense = new Vehicleexpense({
               driverId: req.user.role === "driver" ? req.user.id : driver._id,
               deviceId: vehicleId,
               vehicleName: vehicle.vehicleNumber || "Unknown",
               amount,
               expenseType: "tyreWheel",
               date: installationDate,
               vendor: vendorName,
               description: `Tire purchase: ${brandName}, Serial: ${tyreSerialNumber}, Position: ${position}`,
               billImg: billImgId,
               paymentMode,
               location,
               lat: lat ? lat : null,
               long: long ? long : null,
          });
          await expense.save();

          const tire = new Tire({
               vehicleId,
               expenseId: expense._id,
               category: vehicle.categoryId?.categoryName || "Unknown",
               position,
               tyreSerialNumber,
               brandName,
               tyreStatus,
               installationDate,
               vendorName,
               location,
               lat: lat ? lat : null,
               long: long ? long : null,
               tyreSize,
               billImg: billImgId,
               amount,
               paymentMode,
          });
          await tire.save();

          if (driver.currentTripId) await Trip.findByIdAndUpdate(driver.currentTripId, { $inc: { spentAmount: amount } });
          return res.status(201).json({ success: true, message: "Tire and expense added successfully", tire, expense });
     } catch (error) {
          console.error(error.message);
          return res.status(500).json({ success: false, message: "Error adding tire and expense", error: error.message });
     }
};

exports.getAllTires = async (req, res) => {
     try {
          let tires = [];

          if (req.user.role === "superadmin") {
               tires = await Tire.find().select("-__v").sort({ createdAt: -1 });

          } else if (req.user.role === "user") {
               const drivers = await Driver.find({ supervisor: req.user.id }).select("deviceId");

               if (drivers.length === 0) {
                    return res.status(404).json({ message: "No drivers found." });
               }

               const deviceIds = drivers
                    .filter((d) => d.deviceId)
                    .map((d) => d.deviceId);

               const vehicles = await VehicleMaster.find({
                    deviceId: { $in: deviceIds },
               }).select("_id");

               const vehicleIds = vehicles.map((v) => v._id);

               tires = await Tire.find({ vehicleId: { $in: vehicleIds } })
                    .select("-__v")
                    .sort({ createdAt: -1 });

          } else if (req.user.role === "driver") {
               const driver = await Driver.findById(req.user.id).select("deviceId").lean();

               if (!driver || !driver.deviceId) {
                    return res.status(400).json({
                         message: "Driver not found or no assigned vehicle",
                    });
               }

               const vehicle = await VehicleMaster.findOne({
                    deviceId: driver.deviceId,
               }).select("_id");

               if (!vehicle) {
                    return res.status(400).json({
                         message: "No vehicle mapped with this driver",
                    });
               }

               tires = await Tire.find({ vehicleId: vehicle._id })
                    .select("-__v")
                    .sort({ createdAt: -1 });

          } else {
               return res.status(403).json({
                    success: false,
                    message: "Unauthorized access",
               });
          }

          const tireVehicleIds = [
               ...new Set(tires.map((t) => t.vehicleId?.toString()).filter(Boolean)),
          ];

          const vehicles = await VehicleMaster.find({
               _id: { $in: tireVehicleIds },
          })
               .select("vehicleNumber make deviceId")
               .populate("deviceId", "name");

          const vehicleMap = {};

          vehicles.forEach((vehicle) => {
               vehicleMap[vehicle._id.toString()] = {
                    vehicleNumber: vehicle.vehicleNumber,
                    make: vehicle.make,
                    deviceId: vehicle.deviceId,
               };
          });

          const enrichedTires = tires.map((tire) => ({
               ...tire.toObject(),
               vehicleId: {
                    _id: tire.vehicleId,
                    vehicleNumber:
                         vehicleMap[tire.vehicleId?.toString()]?.vehicleNumber || null,
                    make:
                         vehicleMap[tire.vehicleId?.toString()]?.make || null,
                    deviceId:
                         vehicleMap[tire.vehicleId?.toString()]?.deviceId || null,
               },
          }));

          return res.status(200).json(enrichedTires);
     } catch (error) {
          console.error(error);
          return res.status(500).json({
               success: false,
               message: "Error fetching tires",
               error: error.message,
          });
     }
};

exports.updateTire = async (req, res) => {
     try {
          if (req.user.role !== "driver" && req.user.role !== "user") {
               return res.status(403).json({ success: false, message: "Unauthorized access" });
          }

          const {
               category,
               position,
               tyreSerialNumber,
               brandName,
               tyreStatus,
               installationDate,
               vendorName,
               location,
               lat,
               long,
               tyreSize,
               amount,
               paymentMode,
          } = req.body;

          const tire = await Tire.findById(req.params.id);
          if (!tire) {
               return res.status(404).json({ success: false, message: "Tire not found" });
          }

          if (req.user.role === "driver") {
               const driver = await Driver.findById(req.user.id);
               if (!driver || !driver.deviceId || String(driver.deviceId) !== String(tire.vehicleId)) {
                    return res.status(403).json({ message: "Unauthorized: Tire does not belong to the driver's vehicle" });
               }
          }

          let billImgId = tire.billImg;
          const billImg = req.files?.["billImg"]?.[0];
          if (billImg) {
               const { base64Data, contentType } = await compressImage(billImg);

               if (billImgId) {
                    await VehicleExpenseImage.findByIdAndUpdate(billImgId, { base64Data, contentType });
               } else {
                    const newImage = new VehicleExpenseImage({ base64Data, contentType });
                    const savedImg = await newImage.save();
                    billImgId = savedImg._id;
               }
          }

          const updateData = {
               ...(category && { category }),
               ...(position && { position }),
               ...(tyreSerialNumber && { tyreSerialNumber }),
               ...(brandName && { brandName }),
               ...(tyreStatus && { tyreStatus }),
               ...(installationDate && { installationDate }),
               ...(vendorName && { vendorName }),
               ...(location && { location }),
               ...(lat && { lat }),
               ...(long && { long }),
               ...(tyreSize && { tyreSize }),
               ...(billImgId && { billImg: billImgId }),
               ...(amount && { amount }),
               ...(paymentMode && { paymentMode }),
          };

          const existingTire = await Tire.findByIdAndUpdate(req.params.id, updateData, {
               new: false,
          });

          if (!existingTire) {
               return res.status(404).json({ success: false, message: "Tire not found" });
          }

          const descriptionText = `Tire purchase: ${brandName || existingTire.brandName}, Serial: ${tyreSerialNumber || existingTire.tyreSerialNumber}, Position: ${position || existingTire.position}`;

          const expense = await Vehicleexpense.findOne({
               vehicleId: tire.vehicleId,
          });

          const vehicleName = (
               await Driver.findOne({ deviceId: tire.vehicleId })
          )?.currentVehicleName || "Unknown";

          const expenseUpdateData = {
               vehicleId: tire.vehicleId,
               vehicleName,
               amount: amount || existingTire.amount,
               expenseType: "Tyre Wheel",
               date: installationDate || existingTire.installationDate,
               vendor: vendorName || existingTire.vendorName,
               description: descriptionText,
               billImg: billImgId || existingTire.billImage,
               paymentMode: paymentMode || existingTire.paymentMode,
               location: location || existingTire.location,
               lat: lat || existingTire.lat,
               long: long || existingTire.long,
          };

          if (expense) {
               await Vehicleexpense.findByIdAndUpdate(expense._id, expenseUpdateData);
          }

          if (amount) {
               const driver =
                    req.user.role === "driver"
                         ? await Driver.findById(req.user.id)
                         : await Driver.findOne({ deviceId: tire.vehicleId });

               if (driver?.currentTripId) {
                    const amountDiff = amount - existingTire.amount;
                    if (amountDiff !== 0) {
                         await Trip.findByIdAndUpdate(driver.currentTripId, {
                              $inc: { spentAmount: amountDiff },
                         });
                    }
               }
          }

          return res.json({
               success: true,
               message: "Tire updated successfully",
          });
     } catch (error) {
          console.error(error);
          return res.status(500).json({
               success: false,
               message: "Error updating tire",
               error: error.message,
          });
     }
};

exports.deleteTire = async (req, res) => {
     try {
          const allowedRoles = ["driver", "user", "superadmin"];
          if (!allowedRoles.includes(req.user.role)) {
               return res.status(403).json({ success: false, message: "Unauthorized access" });
          }

          const tireId = req.params.id;

          const tire = await Tire.findById(tireId);
          if (!tire) {
               return res.status(404).json({ success: false, message: "Tire not found" });
          }

          if (req.user.role === "driver") {
               const driver = await Driver.findById(req.user.id);
               if (!driver || !driver.deviceId || String(driver.deviceId) !== String(tire.vehicleId)) {
                    return res.status(403).json({ message: "Unauthorized: Tire does not belong to the driver's vehicle" });
               }
          }

          if (tire.billImg) {
               await VehicleExpenseImage.findByIdAndDelete(tire.billImg);
          }

          const descriptionText = `Tire purchase: ${tire.brandName}, Serial: ${tire.tyreSerialNumber}, Position: ${tire.position}`;
          await Vehicleexpense.deleteOne({
               expenseType: "tyreWheel",
               vehicleId: tire.vehicleId,
               description: descriptionText,
          });

          const driver =
               req.user.role === "driver"
                    ? await Driver.findById(req.user.id)
                    : await Driver.findOne({ deviceId: tire.vehicleId });

          if (driver && driver.currentTripId) {
               await Trip.findByIdAndUpdate(driver.currentTripId, {
                    $inc: { spentAmount: -tire.amount },
               });
          }

          await Tire.findByIdAndDelete(tireId);

          return res.json({ success: true, message: "Tire deleted successfully" });
     } catch (error) {
          console.error("Error deleting tire:", error);
          return res.status(500).json({
               success: false,
               message: "Error deleting tire",
               error: error.message,
          });
     }
};

exports.getTiresByVehicleId = async (req, res) => {
     try {
          const vehicleId = req.params.id;

          const vehicle = await VehicleMaster.findById(vehicleId)
               .select("vehicleNumber make deviceId")

          if (!vehicle) {
               return res.status(404).json({ message: "Vehicle not found" });
          }

          if (req.user.role === "driver") {
               const driver = await Driver.findById(req.user.id).select("deviceId").lean();

               if (
                    !driver ||
                    !driver.deviceId ||
                    String(driver.deviceId) !== String(vehicle.deviceId?._id || vehicle.deviceId)
               ) {
                    return res.status(403).json({
                         message: "Unauthorized: Tire does not belong to the driver's vehicle",
                    });
               }
          }

          const tires = await Tire.find({ vehicleId })
               .select("-__v")
               .sort({ createdAt: -1 });

          if (!tires.length) {
               return res.status(404).json({ message: "No tires found for this vehicle" });
          }

          const formattedTires = tires.map((item) => ({
               _id: item._id,
               vehicleName: vehicle.vehicleNumber || null,
               make: vehicle.make || null,
               deviceId: vehicle._id || null,
               category: item.category,
               position: item.position,
               tyreSerialNumber: item.tyreSerialNumber,
               brandName: item.brandName,
               tyreStatus: item.tyreStatus,
               installationDate: item.installationDate,
               vendorName: item.vendorName,
               location: item.location,
               lat: item.lat,
               long: item.long,
               tyreSize: item.tyreSize,
               billImg: item.billImg,
               amount: item.amount,
               paymentMode: item.paymentMode,
               createdAt: item.createdAt,
               updatedAt: item.updatedAt,
          }));

          return res.status(200).json(formattedTires);

     } catch (error) {
          console.error(error);
          return res.status(500).json({
               success: false,
               message: "Error fetching tires",
               error: error.message,
          });
     }
};

exports.getBillImageById = async (req, res) => {
     try {
          const imageId = req.params.id;

          const imageDoc = await VehicleExpenseImage.findById(imageId).select("-_id");

          if (!imageDoc) {
               return res.status(404).json({ message: "Bill image not found" });
          }

          return res.json(imageDoc);
     } catch (error) {
          return res.status(500).json({
               success: false,
               message: "Error retrieving image metadata",
               error: error.message,
          });
     }
};
