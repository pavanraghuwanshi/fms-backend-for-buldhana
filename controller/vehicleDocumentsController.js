const VehicleMaster = require("../model/maintenanceDevice.model");
const VehicleDocument = require("../model/vehicleDocumentModel");
const { compressImage } = require("../utils/helperFunctions");


exports.addVehicleDocument = async (req, res) => {
  try {
    const { deviceObjId, documents } = req.body;

    if (!deviceObjId) {
      return res.status(400).json({ message: "deviceObjId is required" });
    }

    const vehicle = await VehicleMaster.findById(deviceObjId).select(
      "vehicleNumber"
    );

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const InsuranceImage = req.files?.["insuranceImage"]?.[0];
    const rcImage = req.files?.["rcImage"]?.[0];
    const pucImage = req.files?.["pucImage"]?.[0];
    const fitnessCertificateImage =
      req.files?.["fitnessCertificateImage"]?.[0];

    const images = {
      ...(InsuranceImage && {
        Insurance: await compressImage(InsuranceImage),
      }),
      ...(rcImage && {
        rc: await compressImage(rcImage),
      }),
      ...(pucImage && {
        puc: await compressImage(pucImage),
      }),
      ...(fitnessCertificateImage && {
        fitnessCertificate: await compressImage(fitnessCertificateImage),
      }),
    };

    const existingDocument = await VehicleDocument.findOne({ deviceObjId });

    if (existingDocument) {
      if (InsuranceImage) {
        if (existingDocument.documents?.Insurance?.image?.base64Data) {
          return res.status(400).json({
            message: "Insurance document already exists",
          });
        }

        await VehicleDocument.findOneAndUpdate(
          { deviceObjId },
          {
            $set: {
              "documents.Insurance.issueDate":
                documents?.Insurance?.issueDate,
              "documents.Insurance.expiryDate":
                documents?.Insurance?.expiryDate,
              "documents.Insurance.companyName":
                documents?.Insurance?.companyName,
              "documents.Insurance.image": images.Insurance,
            },
          }
        );

        return res
          .status(201)
          .json({ message: "Vehicle document saved successfully" });
      }

      if (rcImage) {
        if (existingDocument.documents?.rc?.image?.base64Data) {
          return res.status(400).json({
            message: "RC document already exists",
          });
        }

        await VehicleDocument.findOneAndUpdate(
          { deviceObjId },
          {
            $set: {
              "documents.rc.issueDate": documents?.rc?.issueDate,
              "documents.rc.expiryDate": documents?.rc?.expiryDate,
              "documents.rc.companyName": documents?.rc?.companyName,
              "documents.rc.image": images.rc,
            },
          }
        );

        return res
          .status(201)
          .json({ message: "Vehicle document saved successfully" });
      }

      if (pucImage) {
        if (existingDocument.documents?.puc?.image?.base64Data) {
          return res.status(400).json({
            message: "PUC document already exists",
          });
        }

        await VehicleDocument.findOneAndUpdate(
          { deviceObjId },
          {
            $set: {
              "documents.puc.issueDate": documents?.puc?.issueDate,
              "documents.puc.expiryDate": documents?.puc?.expiryDate,
              "documents.puc.companyName": documents?.puc?.companyName,
              "documents.puc.image": images.puc,
            },
          }
        );

        return res
          .status(201)
          .json({ message: "Vehicle document saved successfully" });
      }

      if (fitnessCertificateImage) {
        if (
          existingDocument.documents?.fitnessCertificate?.image?.base64Data
        ) {
          return res.status(400).json({
            message: "Fitness certificate document already exists",
          });
        }

        await VehicleDocument.findOneAndUpdate(
          { deviceObjId },
          {
            $set: {
              "documents.fitnessCertificate.issueDate":
                documents?.fitnessCertificate?.issueDate,
              "documents.fitnessCertificate.expiryDate":
                documents?.fitnessCertificate?.expiryDate,
              "documents.fitnessCertificate.companyName":
                documents?.fitnessCertificate?.companyName,
              "documents.fitnessCertificate.image":
                images.fitnessCertificate,
            },
          }
        );

        return res
          .status(201)
          .json({ message: "Vehicle document saved successfully" });
      }

      return res.status(400).json({ message: "No image found" });
    }

    const newDocument = new VehicleDocument({
      deviceObjId,
      vehicleName: vehicle.vehicleNumber,
      documents: {
        Insurance: {
          issueDate: documents?.Insurance?.issueDate,
          expiryDate: documents?.Insurance?.expiryDate,
          companyName: documents?.Insurance?.companyName,
          image: images.Insurance,
        },
        rc: {
          issueDate: documents?.rc?.issueDate,
          expiryDate: documents?.rc?.expiryDate,
          companyName: documents?.rc?.companyName,
          image: images.rc,
        },
        puc: {
          issueDate: documents?.puc?.issueDate,
          expiryDate: documents?.puc?.expiryDate,
          companyName: documents?.puc?.companyName,
          image: images.puc,
        },
        fitnessCertificate: {
          issueDate: documents?.fitnessCertificate?.issueDate,
          expiryDate: documents?.fitnessCertificate?.expiryDate,
          companyName: documents?.fitnessCertificate?.companyName,
          image: images.fitnessCertificate,
        },
      },
    });

    await newDocument.save();

    return res.status(201).json({
      message: "Vehicle document saved successfully",
      data: newDocument,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error saving vehicle document",
      error: error.message,
    });
  }
};

exports.updateVehicleDocument = async (req, res) => {
    try {
        const { documents } = req.body;

        const existingDocument = await VehicleDocument.findOne({ deviceObjId: req.params.id });
        if (!existingDocument) return res.status(404).json({ message: "Vehicle document not found" });

        const InsuranceImage = req.files?.["insuranceImage"]?.[0];
        const rcImage = req.files?.["rcImage"]?.[0];
        const pucImage = req.files?.["pucImage"]?.[0];
        const fitnessCertificateImage = req.files?.["fitnessCertificateImage"]?.[0];

        let updatedFields = {};

        if (InsuranceImage) updatedFields["documents.Insurance.image"] = await compressImage(InsuranceImage);
        if (rcImage) updatedFields["documents.rc.image"] = await compressImage(rcImage);
        if (pucImage) updatedFields["documents.puc.image"] = await compressImage(pucImage);
        if (fitnessCertificateImage) updatedFields["documents.fitnessCertificate.image"] = await compressImage(fitnessCertificateImage);


        updatedFields["documents.Insurance.issueDate"] = documents?.Insurance?.issueDate || existingDocument.documents.Insurance.issueDate;
        updatedFields["documents.Insurance.expiryDate"] = documents?.Insurance?.expiryDate || existingDocument.documents.Insurance.expiryDate;
        updatedFields["documents.Insurance.companyName"] = documents?.Insurance?.companyName || existingDocument.documents.Insurance.companyName;

        updatedFields["documents.rc.issueDate"] = documents?.rc?.issueDate || existingDocument.documents.rc.issueDate;
        updatedFields["documents.rc.expiryDate"] = documents?.rc?.expiryDate || existingDocument.documents.rc.expiryDate;
        updatedFields["documents.rc.companyName"] = documents?.rc?.companyName || existingDocument.documents.rc.companyName;

        updatedFields["documents.puc.issueDate"] = documents?.puc?.issueDate || existingDocument.documents.puc.issueDate;
        updatedFields["documents.puc.expiryDate"] = documents?.puc?.expiryDate || existingDocument.documents.puc.expiryDate;
        updatedFields["documents.puc.companyName"] = documents?.puc?.companyName || existingDocument.documents.puc.companyName;

        updatedFields["documents.fitnessCertificate.issueDate"] = documents?.fitnessCertificate?.issueDate || existingDocument.documents.fitnessCertificate.issueDate;
        updatedFields["documents.fitnessCertificate.expiryDate"] = documents?.fitnessCertificate?.expiryDate || existingDocument.documents.fitnessCertificate.expiryDate;
        updatedFields["documents.fitnessCertificate.companyName"] = documents?.fitnessCertificate?.companyName || existingDocument.documents.fitnessCertificate.companyName;

        const updatedDocument = await VehicleDocument.findOneAndUpdate(
            { deviceObjId: req.params.id },
            { $set: updatedFields },
            { new: true }
        );

        return res.status(200).json({ message: "Vehicle document updated successfully", data: updatedDocument });

    } catch (error) {
        return res.status(500).json({ message: "Error updating vehicle document", error: error.message });
    }
};

exports.getVehicleDocument = async (req, res) => {
    try {
        const { deviceObjId, field } = req.query
        const vehicleDocument = await VehicleDocument.findOne({ deviceObjId }).select(`documents.${field}`);

        if (!vehicleDocument) return res.status(404).json({ message: "Vehicle document not found" });

        if (field === 'Insurance') {
            if (!vehicleDocument.documents.Insurance.image.base64Data) {
                return res.status(404).json({ message: "No image found" });
            }
            vehicleDocument.documents.Insurance.image = {
                base64Data: `data:${vehicleDocument.documents.Insurance.image.contentType};base64,${vehicleDocument.documents.Insurance.image.base64Data}`,
                contentType: vehicleDocument.documents.Insurance.image.contentType,
            };
        } else if (field === 'rc') {
            if (!vehicleDocument.documents.rc.image.base64Data) {
                return res.status(404).json({ message: "No image found" });
            }
            vehicleDocument.documents.rc.image = {
                base64Data: `data:${vehicleDocument.documents.rc.image.contentType};base64,${vehicleDocument.documents.rc.image.base64Data}`,
                contentType: vehicleDocument.documents.rc.image.contentType,
            };
        } else if (field === 'puc') {
            if (!vehicleDocument.documents.puc.image.base64Data) {
                return res.status(404).json({ message: "No image found" });
            }
            vehicleDocument.documents.puc.image = {
                base64Data: `data:${vehicleDocument.documents.puc.image.contentType};base64,${vehicleDocument.documents.puc.image.base64Data}`,
                contentType: vehicleDocument.documents.puc.image.contentType,
            };
        } else if (field === 'fitnessCertificate') {
            vehicleDocument.documents.fitnessCertificate.image = {
                base64Data: `data:${vehicleDocument.documents.fitnessCertificate.image.contentType};base64,${vehicleDocument.documents.fitnessCertificate.image.base64Data}`,
                contentType: vehicleDocument.documents.fitnessCertificate.image.contentType,
            };
        } else {
            return res.status(400).json({ message: "Invalid field" });
        }
        return res.status(200).json({ message: "Vehicle document retrieved successfully", vehicleDocument });

    } catch (error) {
        return res.status(500).json({ message: "Error fetching vehicle document", error: error.message });
    }
};

exports.deleteVehicleDocumentImage = async (req, res) => {
    try {
        const { deviceObjId, field } = req.query;

        const vehicleDocument = await VehicleDocument.findOne({ deviceObjId }).select(`documents.${field}`);

        if (!vehicleDocument) return res.status(404).json({ message: "Vehicle document not found" });

        if (field === 'Insurance') {
            if (!vehicleDocument.documents.Insurance.image.base64Data) {
                return res.status(404).json({ message: "No image found" });
            }

            await VehicleDocument.findOneAndUpdate({ deviceObjId }, {
                $unset: { 'documents.Insurance': 1 }
            }).select(`documents.${field}`);
            return res.status(200).json({ message: "Vehicle document deleted successfully" });
        } else if (field === 'rc') {
            if (!vehicleDocument.documents.rc.image.base64Data) {
                return res.status(404).json({ message: "No image found" });
            }
            await VehicleDocument.findOneAndUpdate({ deviceObjId }, {
                $unset: { 'documents.rc': 1 }
            }).select(`documents.${field}`);
            return res.status(200).json({ message: "Vehicle document deleted successfully" });
        } else if (field === 'puc') {
            if (!vehicleDocument.documents.puc.image.base64Data) {
                return res.status(404).json({ message: "No image found" });
            }
            await VehicleDocument.findOneAndUpdate({ deviceObjId }, {
                $unset: { 'documents.puc': 1 }
            }).select(`documents.${field}`);
            return res.status(200).json({ message: "Vehicle document deleted successfully" });

        } else if (field === 'fitnessCertificate') {
            if (!vehicleDocument.documents.fitnessCertificate.image.base64Data) {
                return res.status(404).json({ message: "No image found" });
            }
            await VehicleDocument.findOneAndUpdate({ deviceObjId }, {
                $unset: { 'documents.fitnessCertificate': 1 }
            }).select(`documents.${field}`);
            return res.status(200).json({ message: "Vehicle document deleted successfully" });
        } else {
            return res.status(400).json({ message: "Invalid field" });
        }

    } catch (error) {
        return res.status(500).json({ message: "Error deleting image", error: error.message });
    }
};

exports.getVehicleExpiryDocuments = async (req, res) => {
    try {
        if (req.user.role !== "superadmin" && req.user.role !== "user") return res.status(403).json({ success: false, message: "Unauthorized access" });
        let userId;

        // If superadmin and userId is provided in query, use it; otherwise, use logged-in user's ID for user role
        if (req.user.role === "superadmin" && req.query.userId) userId = req.query.userId;
        else if (req.user.role === "user") userId = req.user.id;

        let deviceQuery = {};
        if (userId) deviceQuery.users = userId;

        const vehicles = await Device.find(deviceQuery).select('_id users').lean();
        const vehicleIds = vehicles.map(vehicle => vehicle._id);

        // Calculate date 30 days from now
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const currentDate = new Date(now.getTime() + istOffset);
        const thirtyDaysFromNow = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000);

        let vehicleQuery = {
            $or: [
                { "documents.Insurance.expiryDate": { $gte: currentDate, $lte: thirtyDaysFromNow } },
                { "documents.rc.expiryDate": { $gte: currentDate, $lte: thirtyDaysFromNow } },
                { "documents.puc.expiryDate": { $gte: currentDate, $lte: thirtyDaysFromNow } },
                { "documents.fitnessCertificate.expiryDate": { $gte: currentDate, $lte: thirtyDaysFromNow } },
            ],
        };

        if (vehicleIds.length > 0) vehicleQuery.deviceObjId = { $in: vehicleIds };
        const expiringDocuments = await VehicleDocument.find(vehicleQuery).select(' -documents.Insurance.image -documents.rc.image -documents.puc.image -documents.fitnessCertificate.image -createdAt -updatedAt -__v').lean();

        const result = expiringDocuments.map(doc => {
            const vehicle = vehicles.find(v => v._id.toString() === doc.deviceObjId.toString());
            return { ...doc, users: vehicle ? vehicle.users : [] };
        });

        return res.status(200).json({ success: true, expiringDocuments: result });
    } catch (error) {
        console.error("Error in getVehicleExpiryDocuments:", error);
        return res.status(500).json({ success: false, message: "Server error" + error.message });
    }
};
