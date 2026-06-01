const express = require("express");
const router = express.Router();
const ExtendedVehicleInfo = require("../model/extendedVehicleModel"); // Adjust the path as needed
const mongoose = require("mongoose");

exports.assignTyre = async (req, res) => {
  const { deviceId, tyreId, wheelPosition } = req.body;

  // Validate input fields
  if (!deviceId || !tyreId || !wheelPosition) {
    return res
      .status(400)
      .json({
        error: "Missing required fields: deviceId, tyreId, or wheelPosition",
      });
  }
  if (!mongoose.Types.ObjectId.isValid(deviceId)) {
    return res.status(400).json({ error: "Invalid deviceId format" });
  }
  if (!mongoose.Types.ObjectId.isValid(tyreId)) {
    return res.status(400).json({ error: "Invalid tyreId format" });
  }
  try {
    // Check across all vehicles if this tyre is already assigned anywhere
    const globalAssignment = await ExtendedVehicleInfo.findOne({
      "assignedTyres.tyre": tyreId,
    });
    if (globalAssignment) {
      return res
        .status(400)
        .json({ error: "This tyre is already assigned to a vehicle" });
    }
    // Find the ExtendedVehicleInfo document for the device
    let vehicleInfo = await ExtendedVehicleInfo.findOne({
      device_id: deviceId,
    });

    // If none exists, create a new one
    if (!vehicleInfo) {
      vehicleInfo = new ExtendedVehicleInfo({
        device_id: deviceId,
        assignedTyres: [],
      });
    }

    // Check if a tyre is already assigned to this wheel position
    const exists = vehicleInfo.assignedTyres.some(
      (assignment) => assignment.wheelPosition === wheelPosition
    );
    if (exists) {
      return res
        .status(400)
        .json({ error: "A tyre is already assigned to this position" });
    }

    // Add the new tyre assignment
    vehicleInfo.assignedTyres.push({ wheelPosition, tyre: tyreId });
    await vehicleInfo.save();

    // Populate the tyre field with only the desired fields
    await vehicleInfo.populate("assignedTyres.tyre");

    // Retrieve the newly added assignment
    const newAssignment = vehicleInfo.assignedTyres.find(
      (assignment) => assignment.wheelPosition === wheelPosition
    );

    return res.status(200).json({
      message: "Tyre assigned successfully",
      data: newAssignment,
    });
  } catch (error) {
    console.error("Error assigning tyre:", error);
    return res
      .status(500)
      .json({ error: error.message || "An unknown error occurred" });
  }
};

exports.detachTyre = async (req, res) => {
  const { deviceId, tyreId } = req.body;

  if (!deviceId || !tyreId) {
    return res
      .status(400)
      .json({ error: "Missing required fields: deviceId or tyreId" });
  }

  if (!mongoose.Types.ObjectId.isValid(deviceId)) {
    return res.status(400).json({ error: "Invalid deviceId format" });
  }
  if (!mongoose.Types.ObjectId.isValid(tyreId)) {
    return res.status(400).json({ error: "Invalid tyreId format" });
  }

  try {
    const vehicleInfo = await ExtendedVehicleInfo.findOne({
      device_id: deviceId,
    });
    if (!vehicleInfo) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    // Check if the tyre is actually assigned
    const assignmentExists = vehicleInfo.assignedTyres.some(
      (assignment) => assignment.tyre.toString() === tyreId
    );
    if (!assignmentExists) {
      return res
        .status(404)
        .json({ error: "Tyre not assigned to this device" });
    }

    // Remove the tyre assignment using the $pull operator
    await ExtendedVehicleInfo.updateOne(
      { device_id: deviceId },
      { $pull: { assignedTyres: { tyre: tyreId } } }
    );

    return res.status(200).json({ message: "Tyre detached successfully" });
  } catch (error) {
    console.error("Error detaching tyre:", error);
    return res.status(500).json({ error: "Failed to detach tyre" });
  }
};

exports.getAssignedTyres = async (req, res) => {
  const { deviceId } = req.query;

  if (!deviceId) {
    return res.status(400).json({ error: "Missing deviceId query parameter" });
  }

  if (!mongoose.Types.ObjectId.isValid(deviceId)) {
    return res.status(400).json({ error: "Invalid deviceId format" });
  }

  try {
    const vehicleInfo = await ExtendedVehicleInfo.findOne({
      device_id: deviceId,
    })
      .populate("assignedTyres.tyre")
      .lean();

    if (!vehicleInfo) {
      return res.status(204).json({ message: "Vehicle not found" });
    }

    // Format the response to include tyre details and wheel position
    const assignedTyres = vehicleInfo.assignedTyres.map((assignment) => ({
      wheelPosition: assignment.wheelPosition,
      tyre: assignment.tyre,
    }));

    return res.status(200).json({ data: assignedTyres });
  } catch (error) {
    console.error("Error fetching assigned tyres:", error);
    return res.status(500).json({ error: "Failed to fetch assigned tyres" });
  }
};

// router.post("/uploadDocuments", upload, async (req, res) => {
exports.uploadDocuments1 = async (req, res) => {
  try {
    const { device_id } = req.params; // Taking device_id from params
    const { categories, issueDates, expiryDates } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const vehicle = await ExtendedVehicleInfo.findOne({ device_id }); // Find vehicle using device_id
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    req.files.forEach((file, index) => {
      let issueDate =
        issueDates && issueDates[index] ? new Date(issueDates[index]) : null;
      let expiryDate =
        expiryDates && expiryDates[index] ? new Date(expiryDates[index]) : null;

      // Ensure dates are valid, otherwise set to null
      if (issueDate && isNaN(issueDate.getTime())) issueDate = null;
      if (expiryDate && isNaN(expiryDate.getTime())) expiryDate = null;

      vehicle.documents.push({
        category: categories[index] || "Unknown", // Prevent empty category errors
        issueDate: issueDate,
        expiryDate: expiryDate,
        file: {
          filename: file.originalname,
          data: file.buffer,
          contentType: file.mimetype,
        },
        uploadedAt: new Date(),
      });
    });

    await vehicle.save();
    res
      .status(200)
      .json({
        message: "Documents uploaded successfully",
        documents: vehicle.documents,
      });
  } catch (error) {
    console.error("Error uploading documents:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.uploadDocuments = async (req, res) => {
  try {
    const { device_id } = req.params; // Taking device_id from params
    const { categories, issueDates, expiryDates } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    // Find vehicle using device_id
    let vehicle = await ExtendedVehicleInfo.findOne({ device_id });

    // If vehicle doesn't exist, create a new one with an empty documents array
    if (!vehicle) {
      vehicle = new ExtendedVehicleInfo({ device_id, documents: [] });
    }

    req.files.forEach((file, index) => {
      let issueDate =
        issueDates && issueDates[index] ? new Date(issueDates[index]) : null;
      let expiryDate =
        expiryDates && expiryDates[index] ? new Date(expiryDates[index]) : null;

      // Ensure dates are valid, otherwise set to null
      if (issueDate && isNaN(issueDate.getTime())) issueDate = null;
      if (expiryDate && isNaN(expiryDate.getTime())) expiryDate = null;

      vehicle.documents.push({
        category: categories[index] || "Unknown", // Prevent empty category errors
        issueDate: issueDate,
        expiryDate: expiryDate,
        file: {
          filename: file.originalname,
          data: file.buffer,
          contentType: file.mimetype,
        },
        uploadedAt: new Date(),
      });
    });

    await vehicle.save();
    res
      .status(200)
      .json({
        message: "Documents uploaded successfully",
        documents: vehicle.documents,
      });
  } catch (error) {
    console.error("Error uploading documents:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const { device_id } = req.params;

    const vehicle = await ExtendedVehicleInfo.findOne({ device_id });

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    // Check if documents exist
    if (!vehicle.documents || vehicle.documents.length === 0) {
      return res.json([]); // Return an empty array if no documents
    }

    // Convert Buffer to Base64
    const documents = vehicle.documents.map((doc) => ({
      ...doc._doc,
      file: {
        filename: doc.file.filename,
        data: doc?.file?.data?.toString("base64"), // Convert Buffer to Base64
        contentType: doc.file.contentType,
      },
    }));

    res.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// router.delete("/delete/:deviceId/:documentId", async (req, res) => {
exports.deleteDocument = async (req, res) => {
  try {
    const { deviceId, documentId } = req.params;

    const updatedVehicle = await ExtendedVehicleInfo.findOneAndUpdate(
      { device_id: deviceId },
      { $pull: { documents: { _id: documentId } } },
      { new: true }
    );

    if (!updatedVehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    res.json({ message: "Document deleted successfully", updatedVehicle });
  } catch (error) {
    res.status(500).json({ message: "Error deleting document", error });
  }
};

exports.updateDocument1 = async (req, res) => {
  try {
    const { device_id, document_id } = req.params;
    const { category, issueDate, expiryDate } = req.body;

    // Find the vehicle to get the existing document
    const vehicle = await ExtendedVehicleInfo.findOne(
      { device_id, "documents._id": document_id },
      { "documents.$": 1 } // Fetch only the matching document
    );

    if (!vehicle || vehicle.documents.length === 0) {
      return res.status(404).json({ message: "Vehicle or document not found" });
    }

    const existingDocument = vehicle.documents[0];

    // Build update object (only update provided fields)
    const updateFields = {};
    if (category) updateFields["documents.$.category"] = category;
    if (issueDate) updateFields["documents.$.issueDate"] = new Date(issueDate);
    if (expiryDate)
      updateFields["documents.$.expiryDate"] = new Date(expiryDate);
    updateFields["documents.$.uploadedAt"] = Date.now();

    // Handle file update
    if (req.file) {
      updateFields["documents.$.file"] = {
        filename: req.file.originalname,
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
    }

    // If there's nothing to update, return early
    if (Object.keys(updateFields).length === 1) {
      // Only 'uploadedAt' would be present
      return res.status(400).json({ message: "No changes provided" });
    }

    // Update only the required fields inside the document
    const updatedVehicle = await ExtendedVehicleInfo.findOneAndUpdate(
      { device_id, "documents._id": document_id },
      { $set: updateFields },
      { new: true }
    );

    res
      .status(200)
      .json({
        message: "Document updated successfully",
        vehicle: updatedVehicle,
      });
  } catch (error) {
    console.error("Error updating document:", error);
    res
      .status(500)
      .json({ message: "Error updating document", error: error.message });
  }
};
