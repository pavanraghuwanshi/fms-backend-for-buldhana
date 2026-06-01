const WarehouseProduct = require("../model/wareHouseModel");
const WarehouseStock = require("../model/wareHouseStockModel");
const { maintenanceDB } = require("../database/database");
const Worker = require("../model/workerModel");

exports.addWarehouseProducts = async (req, res) => {
  const undoOps = [];  // <-- store rollback actions

    try {
    const { role, id: loggedInUserId } = req.user;
    const { warehouseId, products } = req.body;

    // 🔐 ROLE CHECK
    if (role !== "user") {
      return res.status(403).json({
        msg: "Only supervisors are allowed to add warehouse products",
      });
    }

    if (!warehouseId || !products || products.length === 0) {
      return res.status(400).json({ msg: "warehouseId and products required" });
    }

    // 🔐 OWNERSHIP CHECK
    const warehouse = await Warehouse.findById(warehouseId).select("userId");

    if (!warehouse) {
      return res.status(404).json({ msg: "Warehouse not found" });
    }

    if (String(warehouse.userId) !== String(loggedInUserId)) {
      return res.status(403).json({
        msg: "You are not allowed to add products to this warehouse",
      });
    }

    let totalQuantityKg = 0;
    const updatedProducts = [];

    for (const item of products) {
      const totalBags = Math.ceil(item.quantityKg / item.bagSizeKg);
      totalQuantityKg += item.quantityKg;

      updatedProducts.push({
        ...item,
        totalBags,
        productCount: totalBags,
      });

      let existingStock = await WarehouseStock.findOne({
        warehouseId,
        productId: item.productId,
      });

      if (existingStock) {
        // Save old values for rollback
        const oldQty = existingStock.totalQuantityKg;
        const oldBags = existingStock.totalBags;

        // Update stock
        existingStock.totalQuantityKg += item.quantityKg;
        existingStock.totalBags += totalBags;
        await existingStock.save();

        // Add rollback operation
        undoOps.push(async () => {
          await WarehouseStock.updateOne(
            { _id: existingStock._id },
            {
              totalQuantityKg: oldQty,
              totalBags: oldBags
            }
          );
        });

      } else {
        // Create new stock
        const newStock = await WarehouseStock.create({
          warehouseId,
          productId: item.productId,
          totalQuantityKg: item.quantityKg,
          totalBags: totalBags,
        });

        // Add rollback operation (delete created)
        undoOps.push(async () => {
          await WarehouseStock.deleteOne({ _id: newStock._id });
        });
      }
    }

    // Create the warehouse batch
    const batch = await WarehouseProduct.create({
      warehouseId,
      products: updatedProducts,
      totalQuantityKg,
    });

    // Add rollback for warehouse batch
    undoOps.push(async () => {
      await WarehouseProduct.deleteOne({ _id: batch._id });
    });

    return res.status(201).json({
      msg: "Products added successfully",
      data: batch,
    });

  } catch (error) {

    // 🔥 ROLLBACK: run all undo operations
    for (let undo of undoOps.reverse()) {
      try {
        await undo();
      } catch (err) {
        console.log("Rollback step failed:", err);
      }
    }

    console.log(error);
    return res.status(500).json({
      msg: "Transaction failed – All previous changes rolled back",
      error,
    });
  }
};




exports.getWarehouseProducts = async (req, res) => {
  try {
    const { role, id } = req.user;

    let {
      page = 1,
      limit = 10,
      search = "",
      warehouseId,
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    let filter = {};

    // 🔐 Role validation
    if (!["superadmin", "user", "worker"].includes(role)) {
      return res.status(403).json({ message: "Unauthorized role" });
    }

    // 👑 Superadmin → all (optional filters only)
    if (role === "superadmin") {
      // no userId restriction
    }

    // 👑 User (Supervisor) → own records
    if (role === "user") {
      filter.supervisorId = id;
    }

    // 👷 Worker → supervisor's records
    if (role === "worker") {
      const worker = await Worker.findById(id).select("supervisor");

      if (!worker || !worker.supervisor) {
        return res.status(403).json({
          message: "Supervisor not assigned to worker",
        });
      }

      filter.supervisorId = worker.supervisor;
    }

    // Warehouse filter
    if (warehouseId) {
      filter.warehouseId = warehouseId;
    }

    // Search inside products
    if (search.trim()) {
      filter["products.productName"] = { $regex: search, $options: "i" };
    }

    const skip = (page - 1) * limit;

    const totalItems = await WarehouseProduct.countDocuments(filter);

    const data = await WarehouseProduct.find(filter)
      .populate("warehouseId", "wareHouseName location capacityKg")
      .populate("products.productId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      msg: "Warehouse products fetched successfully",
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      data,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      msg: "Failed to fetch warehouse products",
      error: error.message,
    });
  }
};


exports.updateWarehouseProducts = async (req, res) => {
  const undoOps = [];

  try {
    const { id } = req.params;
    const { products } = req.body;
    const { role, id: loggedInUserId } = req.user;

    if (!id || !products || products.length === 0) {
      return res.status(400).json({ msg: "id and products are required" });
    }

    // Fetch old batch
    const oldBatch = await WarehouseProduct.findById(id);

    if (!oldBatch) {
      return res.status(404).json({ msg: "Batch not found" });
    }

    // 🔐 AUTHORIZATION CHECK (🔥 THIS IS THE KEY PART 🔥)
    if (role !== "user") {
      return res.status(403).json({
        msg: "Only supervisors are allowed to update warehouse products",
      });
    }

    if (String(oldBatch.userId) !== String(loggedInUserId)) {
      return res.status(403).json({
        msg: "You are not allowed to update this warehouse batch",
      });
    }


    const warehouseId = oldBatch.warehouseId;

    // ===============================================
    // STEP 1: CREATE MAPS FOR DIFF LOGIC
    // ===============================================

    const oldMap = new Map();
    for (const p of oldBatch.products) {
      oldMap.set(String(p.productId), p);
    }

    const newMap = new Map();
    for (const p of products) {
      newMap.set(String(p.productId), p);
    }

    // ===============================================
    // STEP 2: REMOVE PRODUCTS (old but not in new)
    // ===============================================

    for (const [productId, oldItem] of oldMap) {
      if (!newMap.has(productId)) {
        const stock = await WarehouseStock.findOne({
          warehouseId,
          productId,
        });

        if (stock) {
          const prevQty = stock.totalQuantityKg;
          const prevBags = stock.totalBags;

          stock.totalQuantityKg -= oldItem.quantityKg;
          stock.totalBags -= oldItem.totalBags;
          await stock.save();

          // rollback for delete
          undoOps.push(async () => {
            await WarehouseStock.updateOne(
              { _id: stock._id },
              { totalQuantityKg: prevQty, totalBags: prevBags }
            );
          });
        }
      }
    }

    // ===============================================
    // STEP 3: ADD OR UPDATE PRODUCTS
    // ===============================================

    let totalQuantityKg = 0;
    const updatedProducts = [];

    for (const item of products) {
      const totalBags = Math.ceil(item.quantityKg / item.bagSizeKg);
      const productId = String(item.productId);

      totalQuantityKg += item.quantityKg;

      updatedProducts.push({
        ...item,
        totalBags,
        productCount: totalBags,
      });

      const oldItem = oldMap.get(productId);

      let stock = await WarehouseStock.findOne({
        warehouseId,
        productId,
      });

      if (oldItem) {
        // ========== UPDATE EXISTING PRODUCT ==========
        const diffQty = item.quantityKg - oldItem.quantityKg;
        const diffBags = totalBags - oldItem.totalBags;

        const prevQty = stock.totalQuantityKg;
        const prevBags = stock.totalBags;

        stock.totalQuantityKg += diffQty;
        stock.totalBags += diffBags;
        await stock.save();

        undoOps.push(async () => {
          await WarehouseStock.updateOne(
            { _id: stock._id },
            { totalQuantityKg: prevQty, totalBags: prevBags }
          );
        });

      } else {
        // ========== ADD NEW PRODUCT ==========
        const newStock = await WarehouseStock.create({
          warehouseId,
          productId,
          totalQuantityKg: item.quantityKg,
          totalBags,
        });

        undoOps.push(async () => {
          await WarehouseStock.deleteOne({ _id: newStock._id });
        });
      }
    }

    // ===============================================
    // STEP 4: UPDATE THE BATCH DOCUMENT
    // ===============================================

    const prevBatch = {
      products: oldBatch.products,
      totalQuantityKg: oldBatch.totalQuantityKg,
    };

    oldBatch.products = updatedProducts;
    oldBatch.totalQuantityKg = totalQuantityKg;

    await oldBatch.save();

    undoOps.push(async () => {
      await WarehouseProduct.updateOne(
        { _id: id },
        {
          products: prevBatch.products,
          totalQuantityKg: prevBatch.totalQuantityKg,
        }
      );
    });

    // ===============================================
    // SUCCESS RESPONSE
    // ===============================================

    return res.status(200).json({
      msg: "Warehouse batch updated successfully",
      data: oldBatch,
    });

  } catch (error) {
    // ===============================================
    // ROLLBACK ON ERROR
    // ===============================================

    console.log("Error occurred. Starting rollback...");

    for (let undo of undoOps.reverse()) {
      try {
        await undo();
      } catch (err) {
        console.log("Rollback failed:", err);
      }
    }

    return res.status(500).json({
      msg: "Update failed — All changes reverted",
      error,
    });
  }
};


exports.deleteWarehouseProducts = async (req, res) => {
  const undoOps = [];
try {
    const { id } = req.params;
    const { role, id: loggedInUserId } = req.user;

    if (!id) {
      return res.status(400).json({ msg: "Batch id is required" });
    }

    // Fetch batch
    const batch = await WarehouseProduct.findById(id);

    if (!batch) {
      return res.status(404).json({ msg: "Batch not found" });
    }

    // 🔐 AUTHORIZATION CHECK (🔥 REQUIRED 🔥)
    if (role !== "user") {
      return res.status(403).json({
        msg: "Only supervisors are allowed to delete warehouse products",
      });
    }

    if (String(batch.userId) !== String(loggedInUserId)) {
      return res.status(403).json({
        msg: "You are not allowed to delete this warehouse batch",
      });
    }

    const warehouseId = batch.warehouseId;

    // ===============================================
    // STEP 1: REVERT STOCK FOR ALL PRODUCTS
    // ===============================================

    for (const item of batch.products) {
      const stock = await WarehouseStock.findOne({
        warehouseId,
        productId: item.productId,
      });

      if (stock) {
        const prevQty = stock.totalQuantityKg;
        const prevBags = stock.totalBags;

        // subtract stock
        stock.totalQuantityKg -= item.quantityKg;
        stock.totalBags -= item.totalBags;

        await stock.save();

        undoOps.push(async () => {
          await WarehouseStock.updateOne(
            { _id: stock._id },
            { totalQuantityKg: prevQty, totalBags: prevBags }
          );
        });
      }
    }

    // ===============================================
    // STEP 2: DELETE BATCH DOCUMENT
    // ===============================================

    const deletedBatchCopy = {
      warehouseId,
      products: batch.products,
      totalQuantityKg: batch.totalQuantityKg,
    };

    await batch.deleteOne();

    undoOps.push(async () => {
      await WarehouseProduct.create({
        _id: id,
        ...deletedBatchCopy,
      });
    });

    // ===============================================
    // SUCCESS
    // ===============================================

    return res.status(200).json({
      msg: "Warehouse batch deleted successfully",
    });

  } catch (error) {
    // ===============================================
    // ROLLBACK ON FAILURE
    // ===============================================

    console.log("Delete error. Starting rollback...");

    for (let undo of undoOps.reverse()) {
      try {
        await undo();
      } catch (err) {
        console.log("Rollback failed:", err);
      }
    }

    return res.status(500).json({
      msg: "Delete failed — All changes reverted",
      error,
    });
  }
};

