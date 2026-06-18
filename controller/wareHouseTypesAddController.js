const Warehouse = require("../model/wareHouseAddModel");
const ProductList = require("../model/wareHouseProductAddModel");
const Worker = require("../model/workerModel");
const mongoose = require("mongoose"); 


//CREATE Warehouse
exports.createWarehouse = async (req, res) => {
  try {
    const { wareHouseName, location } = req.body;
    const { role, id } = req.user;

    // 🔐 Role check
    if (!["superadmin", "user"].includes(role)) {
      return res.status(403).json({
        message: "You are not authorized to create a warehouse",
      });
    }

    // 🔎 Validation
    if (!wareHouseName || !location) {
      return res.status(400).json({
        message: "wareHouseName and location are required",
      });
    }

    // ❌ Duplicate check (same user)
    const existing = await Warehouse.findOne({
      wareHouseName,
      userId: id,
    });

    if (existing) {
      return res.status(400).json({
        message: "Warehouse already exists",
      });
    }

    // ✅ Create warehouse
    const warehouse = await Warehouse.create({
      wareHouseName,
      location,
      userId: id,      // 🔥 owner
      createdBy: id,   // 🔥 audit
    });

    return res.status(201).json({
      msg: "Warehouse created successfully",
      data: warehouse,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      msg: "Error creating warehouse",
      error: err.message,
    });
  }
};


//GET All Warehouses
exports.getWarehouses = async (req, res) => {
  try {
    const { role, id, supervisor } = req.user;

    // 🔐 Only supervisor & worker
    if (!["user", "worker"].includes(role)) {
      return res.status(403).json({
        message: "You are not authorized to view warehouses",
      });
    }

    let filter = {};

    // 👑 Supervisor → his own warehouses
    if (role === "user") {
      filter.userId = new mongoose.Types.ObjectId(id);
    }

    // 👷 Worker → supervisor’s warehouses
    if (role === "worker") {
      if (!supervisor) {
        return res.status(403).json({
          message: "Supervisor not assigned to worker",
        });
      }

      filter.userId = new mongoose.Types.ObjectId(supervisor);
    }

    // 🔎 Search
    let { page = 1, limit = 10, search = "" } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    if (search) {
      filter.$or = [
        { wareHouseName: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
      ];
    }

    console.log("FINAL FILTER:", filter);

    const totalItems = await Warehouse.countDocuments(filter);

    const data = await Warehouse.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      msg: "Warehouses fetched successfully",
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      data,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      msg: "Error fetching warehouses",
      error: err.message,
    });
  }
};





//GET Warehouse by ID
exports.getWarehouseById = async (req, res) => {
  try {
    const warehouseId = req.params.id;

    let filter = { _id: warehouseId };

    if (req.user.role !== "superadmin") {
      filter.createdBy = req.user.userId;
    }

    const data = await Warehouse.findOne(filter);

    if (!data) {
      return res.status(404).json({ msg: "Warehouse not found or unauthorized" });
    }

    res.status(200).json({ data });

  } catch (err) {
    res.status(500).json({ msg: "Error", error: err.message });
  }
};


//UPDATE Warehouse
exports.updateWarehouse = async (req, res) => {
  try {
    const warehouseId = req.params.id;
const { role, id } = req.user;

    //Only supervisor allowed
    if (role !== "user") {
      return res.status(403).json({
        msg: "Only supervisor can update warehouse",
      });
    }

    //Supervisor can update only his own warehouse
    const filter = {
      _id: warehouseId,
      userId: id, // ownership check
    };

    const updated = await Warehouse.findOneAndUpdate(filter, req.body, { new: true });

    if (!updated) {
      return res.status(404).json({ msg: "Warehouse not found or unauthorized" });
    }

    res.status(200).json({ msg: "Warehouse updated", data: updated });

  } catch (err) {
    res.status(500).json({ msg: "Error updating warehouse", error: err.message });
  }
};


//DELETE Warehouse
exports.deleteWarehouse = async (req, res) => {
  try {
    const warehouseId = req.params.id;

   const { role, id } = req.user;

    //Only supervisor allowed
    if (role !== "user") {
      return res.status(403).json({
        msg: "Only supervisor can update warehouse",
      });
    }

    //Supervisor can update only his own warehouse
    const filter = {
      _id: warehouseId,
      userId: id, // ownership check
    };

    const deleted = await Warehouse.findOneAndDelete(filter);

    if (!deleted) {
      return res.status(404).json({ msg: "Warehouse not found or unauthorized" });
    }

    res.status(200).json({ msg: "Warehouse deleted" });

  } catch (err) {
    res.status(500).json({ msg: "Error deleting warehouse", error: err.message });
  }
};

//Ware House For DropDown
exports.getWarehousesForDropDown = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    let filter = {};


    // ROLE BASED FILTER
    if (req.user.role === "worker") {
      filter.createdBy = req.user.supervisor; // worker sees admin's data
    } else if (req.user.role !== "superadmin") {
      filter.createdBy = req.user.id; // admin/user
    }

    if (search) {
      filter.wareHouseName = { $regex: search, $options: "i" };
    }

    const data = await Warehouse.find(filter)
    .select("_id wareHouseName")
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ createdAt: -1 });
    const total = await Warehouse.countDocuments(filter)

    res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
       data 
      });
  } catch (err) {
    res.status(500).json({
      msg: "Error fetching warehouses",
      error: err.message,
    });
  }
};






//CREATE Product
exports.createProduct = async (req, res) => {
  try {
    const { name, category, unit } = req.body;
    const {role, id} = req.user;

    // Role check 
     let ownerUserId;

    if (role === "user") {
      ownerUserId = id;
    } else if (role === "superadmin") {
      ownerUserId = parentUserId;
    } else {
      return res.status(403).json({ msg: "Unauthorized role" });
    }

    // 🔍 duplicate check
    const existing = await ProductList.findOne({
      name,
      userId: ownerUserId
    });

    if (existing) {
      return res.status(400).json({
        msg: "Product already exists for this user"
      });
    }

    // ✅ create product
    const newProduct = await ProductList.create({
      name,
      category,
      unit,
      userId: ownerUserId
    });

    return res.status(201).json({
      msg: "Product created successfully",
      data: newProduct
    });

  } catch (err) {
    return res.status(500).json({
      msg: "Error creating product",
      error: err.message
    });
  }
};


//GET All Products
exports.getProducts = async (req, res) => {
  try {
    const { role, id } = req.user;
    let { page = 1, limit = 10, search = "" } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    let filter = {};

    /* =======================
       🔐 ROLE BASED ACCESS
    ======================= */

    // 👑 Supervisor → own products
    if (role === "user") {
      filter.userId = new mongoose.Types.ObjectId(id);
    }

    // 👷 Worker → supervisor's products
    else if (role === "worker") {
      const worker = await Worker.findById(id).select("supervisor");

      if (!worker || !worker.supervisor) {
        return res.status(403).json({
          message: "Supervisor not assigned to worker",
        });
      }

      filter.userId = new mongoose.Types.ObjectId(worker.supervisor);
    }

    else {
      return res.status(403).json({ message: "Unauthorized role" });
    }

    /* =======================
       🔍 SEARCH
    ======================= */

    if (search.trim() !== "") {
      filter.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { category: { $regex: search.trim(), $options: "i" } },
      ];
    }

    console.log("FINAL FILTER:", filter);

    /* =======================
       📦 QUERY
    ======================= */

    const total = await ProductList.countDocuments(filter);

    const data = await ProductList.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data,
    });

  } catch (error) {
    console.error("GET PRODUCTS ERROR:", error);
    return res.status(500).json({
      message: "Error fetching products",
      error: error.message,
    });
  }
};





//GET ProductListby ID
exports.getProductById = async (req, res) => {
  try {
    const productId = req.params.id;

    let filter = { _id: productId };

    if (req.user.role !== "superadmin") {
      filter.createdBy = req.user.userId;
    }

    const data = await ProductList.findOne(filter);

    if (!data) {
      return res.status(404).json({ msg: "ProductList not found or unauthorized" });
    }

    res.status(200).json({ data });

  } catch (err) {
    res.status(500).json({ msg: "Error", error: err.message });
  }
};



//UPDATE Product
exports.updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const { role, id } = req.user;

      //ROLE CHECK

    //Workers are NOT allowed
    if (!["superadmin", "user"].includes(role)) {
      return res.status(403).json({
        message: "You are not authorized to update products",
      });
    }

    let filter = { _id: productId };

      //SUPERVISOR OWNERSHIP

    // Supervisor can update ONLY his own products
    if (role === "user") {
      filter.userId = new mongoose.Types.ObjectId(id);
    }

    // Superadmin → no ownership restriction

    const updated = await ProductList.findOneAndUpdate(
      filter,
      req.body,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        message: "Product not found or unauthorized",
      });
    }

    return res.status(200).json({
      message: "Product updated successfully",
      data: updated,
    });

  } catch (err) {
    console.error("UPDATE PRODUCT ERROR:", err);
    return res.status(500).json({
      message: "Error updating product",
      error: err.message,
    });
  }
};



//DELETE Product
exports.deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const { role, id } = req.user;

    /* =======================
       🔐 ROLE CHECK
    ======================= */

    if (!["superadmin", "user"].includes(role)) {
      return res.status(403).json({
        message: "You are not authorized to delete products",
      });
    }

    let filter = { _id: productId };

    /* =======================
       👑 SUPERVISOR OWNERSHIP
    ======================= */

    // Supervisor → can delete only his products
    if (role === "user") {
      filter.userId = new mongoose.Types.ObjectId(id);
    }

    // Superadmin → no ownership restriction

    const deleted = await ProductList.findOneAndDelete(filter);

    if (!deleted) {
      return res.status(404).json({
        message: "Product not found or unauthorized",
      });
    }

    return res.status(200).json({
      message: "Product deleted successfully",
    });

  } catch (err) {
    console.error("DELETE PRODUCT ERROR:", err);
    return res.status(500).json({
      message: "Error deleting product",
      error: err.message,
    });
  }
};


exports.getProductsForDropdown = async (req, res) => {
  try {
    let { page = 1, limit = 10, search = "" } = req.query;

    page = Math.max(parseInt(page) || 1, 1);
    limit = Math.max(parseInt(limit) || 10, 1);

    const filter = {};

    const loggedInUserId = req.user.id || req.user._id || req.user.userId;

    if (req.user.role === "driver") {
      filter.createdBy = req.user.supervisor;
    } else if (req.user.role !== "superadmin") {
      filter.createdBy = loggedInUserId;
    }

    if (search && search.trim()) {
      filter.name = { $regex: search.trim(), $options: "i" };
    }

    const total = await ProductList.countDocuments(filter);

    const data = await ProductList.find(filter)
      .select("_id name category")
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data,
    });
  } catch (err) {
    return res.status(500).json({
      msg: "Error fetching products dropdown with pagination",
      error: err.message,
    });
  }
};
