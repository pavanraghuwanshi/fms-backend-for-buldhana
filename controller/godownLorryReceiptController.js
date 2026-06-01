const WarehouseStock = require("../model/wareHouseStockModel");
const GodownLorryReceipt = require("../model/GodownLorryReceiptModel");
const Railhead = require("../model/Railhead");
const WarehouseProduct = require("../model/wareHouseModel");
const WarehouseProducts = require("../model/wareHouseStockModel");
const Counter = require("../model/counterModel");

const fs = require("fs");
const path = require("path");

const mongoose = require("mongoose");

// create godown lorry receipt

exports.createGodownLorryReceipt = async (req, res) => {
  let undoOps = [];

  try {
    //ROLE VALIDATION
    if (!["superadmin", "user", "worker"].includes(req.user.role)) {
      return res.status(403).json({
        message: "You are not authorized to create a lorry receipt",
      });
    }

    const payload = req.body;

    //ROLE-BASED PAYLOAD SETUP
    if (req.user.role === "user") {
      payload.supervisorId = req.user.id;
      payload.supervisorName = req.user.username;
    }

    if (req.user.role === "worker") {
      payload.workerId = req.user.id;
      payload.supervisorId = req.user.supervisor;
      payload.supervisorName = req.user.supervisorName;
    }

    //BASIC VALIDATIONS

    if (!payload.products || payload.products.length === 0) {
      return res.status(400).json({ message: "Products are required" });
    }

    // WAREHOUSE → PARTY (Deduct from WarehouseProduct)
    if (payload.issuedBy === "Warehouse" && payload.receivedBy === "Party") {
      const warehouseId = payload.warehouseId;
      if (!warehouseId) {
        throw new Error("warehouseId is required for Warehouse → Party");
      }

      const warehouseObjectId = new mongoose.Types.ObjectId(warehouseId);

      for (const item of payload.products) {
        const { productId, quantityMT, bagSize, totalBags } = item;

        if (!productId || !quantityMT || !bagSize) {
          throw new Error("productId, quantityMT, and bagSize are required");
        }

        const productObjectId = new mongoose.Types.ObjectId(productId);

        // 🔍 FIND PRODUCT STOCK
        const warehouseProduct = await WarehouseProduct.findOne({
          warehouseId: warehouseObjectId,
          "products.productId": productObjectId,
          "products.bagSize": Number(bagSize),
        });

        if (!warehouseProduct) {
          throw new Error(`Warehouse stock not found for product ${productId}`);
        }

        const product = warehouseProduct.products.find(
          (p) => p.productId.toString() === productId && p.bagSize === Number(bagSize)
        );

        if (!product || product.quantityMT < quantityMT || product.totalBags < totalBags) {
          throw new Error(
            `Insufficient warehouse stock for product ${productId}`
          );
        }

        // 🔥 DEDUCT MT DIRECTLY
        const updateResult = await WarehouseProduct.updateOne(
          {
            warehouseId: warehouseObjectId,
          },
          {
            $inc: {
              "products.$[p].quantityMT": -quantityMT,
              "products.$[p].productTotalCountMT": -quantityMT,
               "products.$[p].totalBags": -Number(totalBags || 0),
            },
          },
          {
            arrayFilters: [{ "p.productId": productObjectId, "p.bagSize": Number(bagSize),  }],
          }
        );

        if (updateResult.modifiedCount === 0) {
          throw new Error(
            `Warehouse deduction failed for product ${productId}`
          );
        }
      }
    }

    // ================= RAILHEAD → PARTY (MT BASED DEDUCTION) =================
    if (payload.issuedBy === "Railhead" && payload.receivedBy === "Party") {
      console.log("🔥 Railhead → Party stock deduction started");

      for (const item of payload.products) {
        const { productId, quantityMT,bagSize, totalBags  } = item;

        if (!productId || !quantityMT || !bagSize) {
          throw new Error("productId, quantityMT, and bagSize are required");
        }

        const productObjectId = new mongoose.Types.ObjectId(productId);

        // 🔍 FIND RAILHEAD STOCK (ONLY BY PRODUCT)
        const railheadStock = await Railhead.findOne({
          productId: productObjectId,
          supervisorId: payload.supervisorId,
          bagSize: Number(bagSize),
        });

        console.log("Railhead stock found:", railheadStock);

        if (!railheadStock) {
          throw new Error(`Railhead stock not found for product ${productId}`);
        }

        // 🔹 CHECK SUFFICIENT MT
        if (railheadStock.quantityMT < quantityMT || railheadStock.totalBags < totalBags) {
          throw new Error(
            `Insufficient Railhead stock for product ${productId}`
          );
        }

        // 🔁 SAVE FOR UNDO (ROLLBACK)
        undoOps.push({
          model: "Railhead",
          docId: railheadStock._id,
          quantityMT: railheadStock.quantityMT,
          totalBags: railheadStock.totalBags,
        });

        // 🔥 DEDUCT MT ONLY
        await Railhead.updateOne(
          { _id: railheadStock._id },
          {
            $inc: {
              quantityMT: -quantityMT,
              totalBags: -Number(totalBags || 0),
            },
          }
        );
      }
    }

    //STATUS COMPLETION LOGIC
    if (
      (payload.issuedBy === "Rack" && payload.receivedBy === "Railhead") ||
      (payload.issuedBy === "Railhead" && payload.receivedBy === "Warehouse")
    ) {
      payload.status = "Completed";
    } else {
      payload.status = "Pending";
    }

    // 🔢 GENERATE UNIQUE RECEIPT NUMBER
    const counter = await Counter.findOneAndUpdate(
      { name: "godownLorryReceipt",  companyId: payload.companyId   },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    payload.receiptNo = String(counter.seq).padStart(3, "0");

    //CREATE LORRY RECEIPT
    const newReceipt = await GodownLorryReceipt.create(payload);

    // ================= RACK → RAILHEAD (CREATE RECEIPT | MT BASED) =================
    if (payload.issuedBy === "Rack" && payload.receivedBy === "Railhead") {
      for (const item of payload.products) {
        const productId = new mongoose.Types.ObjectId(item.productId);
        const quantityMT = Number(item.quantityMT);
        const bagSize = Number(item.bagSize); 

        if (!productId || !quantityMT  || !bagSize) {
          throw new Error("productId and quantityMT are required");
        }

        await Railhead.findOneAndUpdate(
          {
            productId: productId, // 🔍 MATCH ONLY BY PRODUCT
            supervisorId: payload.supervisorId ,// 🔍 AND SUPERVISOR
             bagSize: bagSize
          },
          {
            $inc: {
              quantityMT: quantityMT,
              totalBags: Number(item.totalBags || 0)
            },
            $setOnInsert: {
              productName: item.productName,
              bagSize: bagSize,
              supervisor: payload.supervisorId   
            },
          },
          {
            upsert: true,
            new: true,
          }
        );
      }
    }

    // ================= ROAD → WAREHOUSE (ADD STOCK | MT BASED) =================
    if (payload.issuedBy === "Road" && payload.receivedBy === "Warehouse") {
      for (const item of payload.products) {
        const warehouseId = new mongoose.Types.ObjectId(item.warehouseId);
        const productId = new mongoose.Types.ObjectId(item.productId);
        const quantityMT = Number(item.quantityMT);
        const bagSize = Number(item.bagSize);
        const totalBags = Number(item.totalBags || 0);

        if (!warehouseId || !productId || !quantityMT || !bagSize) {
          throw new Error("warehouseId, productId, quantityMT, bagSize are required");
        }

        // 1️⃣ Try to increment existing product (BY PRODUCT ONLY)
        const result = await WarehouseProduct.updateOne(
          {
            warehouseId,
            "products.productId": productId,
            "products.bagSize": bagSize,
          },
          {
            $inc: {
              "products.$[p].quantityMT": quantityMT,
              "products.$[p].productTotalCountMT": quantityMT,
              "products.$[p].totalBags": totalBags, 
            },
          },
          {
            arrayFilters: [{ "p.productId": productId,"p.bagSize": bagSize }],
          }
        );

        // 2️⃣ If product not found → push new product
        if (result.matchedCount === 0) {
          await WarehouseProduct.updateOne(
            { warehouseId },
            {
              $push: {
                products: {
                  productId,
                  quantityMT,
                  productTotalCountMT: quantityMT,
                  bagSize: bagSize, 
                  totalBags: totalBags, 
                },
              },
            },
            { upsert: true }
          );
        }
      }
    }

    // RAILHEAD → WAREHOUSE (ADD STOCK based on quantityMT)
    if (payload.issuedBy === "Railhead" && payload.receivedBy === "Warehouse") {
      for (const item of payload.products) {
        const { warehouseId, productId, quantityMT, bagSize, totalBags  } = item;

        const productObjectId = new mongoose.Types.ObjectId(productId);

        // 🔹 1. FIND RAILHEAD STOCK (ONLY productId)
        const railheadStock = await Railhead.findOne({
          productId: productObjectId,
          supervisorId: payload.supervisorId,
          bagSize: Number(bagSize) 
        });

        if (!railheadStock) {
          throw new Error(`Railhead stock not found for product ${productId}`);
        }

        // 🔹 2. CHECK SUFFICIENT MT
        if (railheadStock.quantityMT < quantityMT || railheadStock.totalBags < totalBags) {
          throw new Error(
            `Insufficient Railhead stock for product ${productId}`
          );
        }

        // 🔹 3. DEDUCT FROM RAILHEAD (MT ONLY)
        const railheadUpdate = await Railhead.updateOne(
          { _id: railheadStock._id },
          {
            $inc: {
              quantityMT: -quantityMT,
               totalBags: -Number(totalBags || 0)
            },
          }
        );

        if (railheadUpdate.modifiedCount === 0) {
          throw new Error("Railhead deduction failed");
        }

        // 🔍 4. FIND WAREHOUSE STOCK DOCUMENT
        const warehouse = await WarehouseProduct.findOne({ warehouseId });

        if (!warehouse) {
          // 🆕 CREATE NEW WAREHOUSE DOCUMENT
          await WarehouseProduct.create({
            warehouseId,
            supervisorId: payload.supervisorId,
            products: [
              {
                productId: productObjectId,
                quantityMT,
                productTotalCountMT: quantityMT,
                bagSize: Number(bagSize),   
                totalBags: Number(totalBags || 0),  
              },
            ],
          });
        } else {
          // 🔍 FIND PRODUCT
          const productIndex = warehouse.products.findIndex(
            (p) => p.productId.toString() === productObjectId.toString() &&   p.bagSize === Number(bagSize)
          );

          if (productIndex !== -1) {
            // 🔼 ADD MT TO EXISTING PRODUCT
            await WarehouseProduct.updateOne(
              { warehouseId },
              {
                $inc: {
                  "products.$[p].quantityMT": quantityMT,
                  "products.$[p].productTotalCountMT": quantityMT,
                  "products.$[p].totalBags": Number(totalBags || 0),
                },
              },
              {
                arrayFilters: [{ "p.productId": productObjectId , "p.bagSize": Number(bagSize) }],
              }
            );
          } else {
            // ➕ PUSH NEW PRODUCT
            await WarehouseProduct.updateOne(
              { warehouseId },
              {
                $push: {
                  products: {
                    productId: productObjectId,
                    quantityMT,
                    productTotalCountMT: quantityMT,
                    bagSize: Number(bagSize),          
                    totalBags: Number(totalBags || 0),
                  },
                },
              }
            );
          }
        }
      }
    }

    return res.status(201).json(newReceipt);
  } catch (error) {
    //ROLLBACK LOGIC
    for (const op of undoOps) {
      if (op.model === "WarehouseStock") {
        await WarehouseStock.findByIdAndUpdate(op.docId, {
          totalQuantityMT: op.totalQuantityMT,
          totalBags: op.totalBags,
        });
      }

      if (op.model === "Railhead") {
        await Railhead.findByIdAndUpdate(op.docId, {
          quantityMT: op.quantityMT,
          totalBags: op.totalBags,
        });
      }
    }

    return res.status(500).json({ message: error.message });
  }
};

// get godown lorry receipts with pagination and search

exports.getGodownLorryReceipts = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "", companyId, status } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    let filter = {};

    // ROLE BASED FILTER
    if (req.user.role === "user") {

      if (req.user.roleType === "school") {
        filter.supervisorId = req.user.id;
      }

      if (req.user.roleType === "branch") {
        filter.supervisorId = req.user.id;
      }

      if (req.user.roleType === "branchGroup") {
        filter.supervisorId = req.user.id;
      }

    }

    if (req.user.role === "worker") {
      filter.workerId = req.user.id;
    }

if (companyId) filter.companyId = new mongoose.Types.ObjectId(companyId);
if (status) filter.status = status;

    // EXCLUDE RACK & ROAD ISSUED RECEIPTS
    filter.issuedBy = { $nin: ["Rack", "Road"] };

    // SEARCHING
    if (search) {
      filter.$or = [
        { driverName: { $regex: search, $options: "i" } },
        { supervisorName: { $regex: search, $options: "i" } },
        { vehicleNumber: { $regex: search, $options: "i" } },
        { ownerName: { $regex: search, $options: "i" } },
        { consignorName: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { receiptNo: { $regex: search, $options: "i" } },
        { consigneeName: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
      ];
    }

    filter.isDeleted = { $ne: true };

    // ------------------------------------------------------------------
    // FETCH DATA WITH PAGINATION
    // ------------------------------------------------------------------
    const receipts = await GodownLorryReceipt.find(filter)
      .populate("workerId", "name")
      .populate(
        "companyId",
        "companyName address mobileNumber officeNumber email gstNumber digitalSignatureId"
      )
      .populate("materialOwnerId", "name address")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await GodownLorryReceipt.countDocuments(filter);

    return res.status(200).json({
      total,
      page,
      limit,
      receipts,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// soft delete godown lorry receipt
exports.softDeleteGodownLorryReceipt = async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({
        message: "Only supervisor can delete consignee",
      });
    }

    const { id } = req.params;

    const receipt = await GodownLorryReceipt.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!receipt) {
      return res.status(404).json({ message: "Lorry receipt not found" });
    }

    return res.status(200).json({ message: "Receipt soft deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// hard delete godown lorry receipt
exports.deleteGodownLorryReceipt = async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({
        message: "Only supervisor can delete consignee",
      });
    }

    const { id } = req.params;

    const receipt = await GodownLorryReceipt.findByIdAndDelete(id);

    if (!receipt) {
      return res.status(404).json({ message: "Lorry receipt not found" });
    }

    return res.status(200).json({ message: "Receipt permanently deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// Update Lorry Receipt Status

exports.updateLorryReceiptStatus = async (req, res) => {
  try {
    if (req.user.role !== "user") {
      return res.status(403).json({
        message: "Only supervisor can delete consignee",
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!["superadmin", "user"].includes(req.user.role)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const receipt = await GodownLorryReceipt.findById(id);
    const oldStatus = receipt.status;
    if (!receipt) return res.status(404).json({ message: "Receipt not found" });

    if (receipt.status === "Cancelled") {
      return res.status(400).json({
        message: "Cancelled receipt cannot be edited",
      });
    }

    if (
      req.user.role === "user" &&
      receipt.supervisorId.toString() !== req.user.id.toString()
    ) {
      return res.status(403).json({ message: "Not your receipt" });
    }

    const { issuedBy, receivedBy } = receipt;

    // ================= CANCEL =================
    if (status === "Cancelled") {
      for (const item of receipt.products) {
        const productId = new mongoose.Types.ObjectId(item.productId);
        const quantityMT = Number(item.quantityMT);
        const bagSize = item.bagSize;
        const totalBags = Number(item.totalBags || 0);

        if (!quantityMT || quantityMT <= 0) continue;

        if (issuedBy === "Rack" && receivedBy === "Railhead") {
          await Railhead.updateOne(
            { productId, bagSize },
            { $inc: { quantityMT: -quantityMT, totalBags: -totalBags } }
          );
        }

        if (issuedBy === "Railhead" && receivedBy === "Party") {
          await Railhead.updateOne(
            { productId, bagSize },
            { $inc: { quantityMT: quantityMT, totalBags: totalBags } }
          );
        }

        if (issuedBy === "Railhead" && receivedBy === "Warehouse") {
          await Railhead.updateOne(
            { productId, bagSize },
            { $inc: { quantityMT: quantityMT, totalBags: totalBags } }
          );

          await WarehouseProduct.updateOne(
            {
              "products.productId": productId,
              "products.bagSize": bagSize,
            },
            {
              $inc: {
                "products.$[p].quantityMT": -quantityMT,
                "products.$[p].productTotalCountMT": -quantityMT,
                "products.$[p].totalBags": -totalBags,
              },
            },
            {
              arrayFilters: [{ "p.productId": productId, "p.bagSize": bagSize }],
            }
          );
        }

        if (issuedBy === "Warehouse" && receivedBy === "Party") {
          await WarehouseProduct.updateOne(
            {
              "products.productId": productId,
              "products.bagSize": bagSize,
            },
            {
              $inc: {
                "products.$[p].quantityMT": quantityMT,
                "products.$[p].productTotalCountMT": quantityMT,
                "products.$[p].totalBags": totalBags,
              },
            },
            {
              arrayFilters: [{ "p.productId": productId, "p.bagSize": bagSize }],
            }
          );
        }
      }

      if (req.file) {
        receipt.acknowledgementImage = `/uploads/AcknowledgementImage/${req.file.filename}`;
      }

      receipt.status = "Cancelled";
      await receipt.save();

      return res.status(200).json({
        message: "Receipt cancelled and stock reverted successfully",
        receipt,
      });
    }

    // ================= PARTIAL =================
    if (status === "Partially Correction") {
      const products =
        typeof req.body.products === "string"
          ? JSON.parse(req.body.products)
          : req.body.products;


        console.log(products,"hhhhhhhhhhhhhhhhhhhhh")
      for (const newItem of products) {
        const productId = new mongoose.Types.ObjectId(newItem.productId);
        const updatedQuantityMT = Number(newItem.updatedQuantityMT);
        const bagSize = newItem.bagSize;
        const totalBags = Number(newItem.totalBags || 0);


        const oldItem = receipt.products.find(
          (p) => p.productId.toString() === productId.toString()
        );

        if (!oldItem) continue;

        const diffMT = Number(oldItem.quantityMT) - updatedQuantityMT;
        // const diffBags = Number(oldItem.totalBags || 0) - totalBags;

        if (diffMT === 0 && totalBags === 0) continue;

        if (receipt.issuedBy === "Railhead") {
           await Railhead.updateOne(
            { productId, bagSize },
            { $inc: { quantityMT: diffMT, totalBags: totalBags } }
          );
        }

        if (receipt.issuedBy === "Warehouse") {
          const warehouseId = new mongoose.Types.ObjectId(newItem.warehouseId);

          await WarehouseProduct.updateOne(
            {
              warehouseId,
              "products.productId": productId,
              "products.bagSize": bagSize,
            },
            {
              $inc: {
                "products.$[p].quantityMT": diffMT,
                "products.$[p].productTotalCountMT": diffMT,
                "products.$[p].totalBags": totalBags,
              },
            },
            {
              arrayFilters: [{ "p.productId": productId, "p.bagSize": bagSize }],
            }
          );
        }

        oldItem.updatedQuantityMT = updatedQuantityMT;
        oldItem.totalBags = totalBags;
      }

      receipt.status = "Partially Correction";
    // ✅ YE LINE MISSING HAI — BAS YE ADD KAR
        if (req.file) {
          receipt.acknowledgementImage =
            `/uploads/AcknowledgementImage/${req.file.filename}`;
        }
      await receipt.save();

      return res.json({ message: "Partial correction done", receipt });
    }

    // ================= MAIN UPDATE =================
    if (req.body.products && status && status !== oldStatus) {
      const products =
        typeof req.body.products === "string"
          ? JSON.parse(req.body.products)
          : req.body.products;

      for (const newItem of products) {
        const productId = new mongoose.Types.ObjectId(newItem.productId);
        const newQtyMT = Number(newItem.quantityMT);
        const bagSize = newItem.bagSize;
        const totalBags = Number(newItem.totalBags || 0);

        const oldItem = receipt.products.find(
          (p) => p.productId.toString() === productId.toString()
        );

        const oldQtyMT = oldItem ? Number(oldItem.quantityMT) : 0;
        const oldBags = oldItem ? Number(oldItem.totalBags || 0) : 0;

        const diffMT = newQtyMT - oldQtyMT;
        // const diffBags = totalBags - oldBags;

        if (diffMT === 0 && totalBags === 0) continue;

        if (issuedBy === "Warehouse" && receivedBy === "Party") {
          const warehouseId = new mongoose.Types.ObjectId(newItem.warehouseId);

          await WarehouseProduct.updateOne(
            {
              warehouseId,
              "products.productId": productId,
              "products.bagSize": bagSize,
            },
            {
              $inc: {
                "products.$[p].quantityMT": -diffMT,
                "products.$[p].productTotalCountMT": -diffMT,
                "products.$[p].totalBags": -totalBags,
              },
            },
            {
              arrayFilters: [{ "p.productId": productId, "p.bagSize": bagSize }],
            }
          );
        }

        if (issuedBy === "Railhead" && receivedBy === "Party") {
          await Railhead.updateOne(
            { productId, bagSize },
            {
              $inc: {
                quantityMT: -diffMT,
                totalBags: -totalBags,
              },
            }
          );
        }

        if (issuedBy === "Railhead" && receivedBy === "Warehouse") {
          await Railhead.updateOne(
            { productId, bagSize },
            {
              $inc: {
                quantityMT: -diffMT,
                totalBags: -totalBags,
              },
            }
          );

          const warehouseId = new mongoose.Types.ObjectId(newItem.warehouseId);

          await WarehouseProduct.updateOne(
            {
              warehouseId,
              "products.productId": productId,
              "products.bagSize": bagSize,
            },
            {
              $inc: {
                "products.$[p].quantityMT": diffMT,
                "products.$[p].productTotalCountMT": diffMT,
                "products.$[p].totalBags": totalBags,
              },
            },
            {
              arrayFilters: [{ "p.productId": productId, "p.bagSize": bagSize }],
            }
          );
        }

        if (oldItem) {
          oldItem.quantityMT = newQtyMT;
          oldItem.totalBags = totalBags;
        }
      }
    }

        // ===== UPDATE SAFE FIELDS ONLY =====
    const fieldsToUpdate = [
      "date",
      "consignorName",
      "consignorAddress",
      "consigneeName",
      "consigneeAddress",
      "materialOwnerId",
      "martialOwnerName",
      "martialOwnerAddress",
      "startLocation",
      "endLocation",
      "vehicleName",
      "driverName",
      "companyId",
      "consignorId",
      "consigneeId",
      "vehicleId",
      "driverId",
      "customerRate",
      "totalAmount",
      "transporterRate",
      "totalTransporterAmount",
      "transporterRateOn",
      "customerRateOn",
      "customerFreight",
      "transporterFreight"
    ];

    fieldsToUpdate.forEach(field => {
      if (req.body[field] !== undefined) {
        receipt[field] = req.body[field];
      }
    });

    if (status) receipt.status = status;

    if (req.file) {
      receipt.acknowledgementImage =
        `/uploads/AcknowledgementImage/${req.file.filename}`;
    }

    await receipt.save();

    return res.json({ message: "Updated", receipt });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.rejectedByParty = async (req, res) => {
  try {
    const { warehouseId, products } = req.body;
    const userId = req.user.id;

    if (!warehouseId || !products?.length) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    // Find warehouse stock document
    let warehouseStock = await WarehouseProduct.findOne({ warehouseId });

    // If warehouse stock does not exist → create new
    if (!warehouseStock) {
      const formattedProducts = products.map((p) => {
        const quantityMT = p.bagSizeMT * p.totalBags;

        return {
          productId: new mongoose.Types.ObjectId(p.productId),
          bagSizeMT: p.bagSizeMT,
          totalBags: p.totalBags,
          quantityMT,
          productTotalCountMT: quantityMT,
        };
      });

      warehouseStock = await WarehouseProduct.create({
        warehouseId,
        products: formattedProducts,
        supervisorId: userId,
      });

      return res.status(201).json({
        message: "Warehouse stock created successfully",
        data: warehouseStock,
      });
    }
    // Warehouse exists → update stock
    for (const incoming of products) {
      if (!incoming.bagSize || !incoming.totalBags) {
        return res.status(400).json({
          message: "bagSize and totalBags are required",
        });
      }

      const bagSizeMT = Number(incoming.bagSize);
      const totalBags = Number(incoming.totalBags);

      const quantityMT = bagSizeMT * totalBags;

      const existingProduct = warehouseStock.products.find(
        (p) =>
          p.productId.toString() === incoming.productId &&
          p.bagSizeMT === bagSizeMT
      );

      if (existingProduct) {
        existingProduct.totalBags += totalBags;
        existingProduct.quantityMT += quantityMT;
        existingProduct.productTotalCountMT += quantityMT;
      } else {
        warehouseStock.products.push({
          productId: incoming.productId,
          bagSizeMT,
          totalBags,
          quantityMT,
          productTotalCountMT: quantityMT,
        });
      }
    }

    await warehouseStock.save();

    res.status(200).json({
      message: "Warehouse stock updated successfully",
      data: warehouseStock,
    });
  } catch (error) {
    console.error("Add Warehouse Products Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


//   Update only Acknoladgement Image

exports.updateAcknowledgementImage = async (req, res) => {
  try {
    if (!["superadmin", "user"].includes(req.user.role)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const { id } = req.params;

    const receipt = await GodownLorryReceipt.findById(id);
    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    if (
      req.user.role === "user" &&
      receipt.supervisorId.toString() !== req.user.id.toString()
    ) {
      return res.status(403).json({ message: "Not your receipt" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    // Delete old image
    if (receipt.acknowledgementImage) {
      const oldPath = path.join(
        __dirname,
        "..",
        receipt.acknowledgementImage
      );

      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Save new image path
    receipt.acknowledgementImage = `/uploads/AcknowledgementImage/${req.file.filename}`;

    await receipt.save();

    return res.status(200).json({
      message: "Acknowledgement image updated successfully",
      receipt,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
