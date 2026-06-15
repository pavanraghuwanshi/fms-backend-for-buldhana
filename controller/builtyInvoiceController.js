const Builty = require("../model/builtyModel");
const BuiltyInvoice = require("../model/builtyInvoiceModel");
const fs = require("fs");
const path = require("path");

exports.createOrReplaceBuiltyInvoice = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { builtyId } = req.params;

    const {
      supervisorId: bodySupervisorId,
      totalAmount = 0,
      paidAmount = 0,
      paymentStatus = "Unpaid",
    } = req.body;

    let finalSupervisorId;

    if (req.user.role === "superadmin") {
      finalSupervisorId = bodySupervisorId;
    } else if (req.user.role === "worker") {
      finalSupervisorId = req.user.supervisor;
    } else if (req.user.role === "user") {
      finalSupervisorId = req.user.id;
    }

    if (!finalSupervisorId) {
      return res.status(400).json({
        message: "supervisorId is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Invoice PDF is required" });
    }

    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ message: "Only PDF file is allowed" });
    }

    if (!["Unpaid", "Partial", "Paid"].includes(paymentStatus)) {
      return res.status(400).json({
        message: "paymentStatus must be Unpaid, Partial or Paid",
      });
    }

    const total = Number(totalAmount || 0);
    const paid = Number(paidAmount || 0);
    const pending = total - paid;

    const builtyPaymentStatus =  paymentStatus === "Paid"? "Completed": paymentStatus === "Partial" ? "Partial" : "Pending";

    if (paid > total) {
      return res.status(400).json({
        message: "paidAmount cannot be greater than totalAmount",
      });
    }

    const builty = await Builty.findOne({
      _id: builtyId,
      supervisorId: finalSupervisorId,
    });

    if (!builty) {
      return res.status(404).json({ message: "Builty not found" });
    }

    if (builty.status !== "Completed") {
      return res.status(400).json({
        message: "Invoice can be created only after builty completion",
      });
    }

    let invoice = await BuiltyInvoice.findOne({
      builtyId: builty._id,
      supervisorId: finalSupervisorId,
    });

    const isNewInvoice = !invoice;

    if (invoice && invoice.paymentStatus === "Paid") {
      return res.status(400).json({
        message: "Invoice cannot be replaced because payment is already Paid",
      });
    }

    // FIX: server.js me /uploads public/uploads se serve ho raha hai,
    // isliye file bhi public/uploads ke andar save hogi.
    const invoiceDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "builty",
      "invoice"
    );

    if (!fs.existsSync(invoiceDir)) {
      fs.mkdirSync(invoiceDir, { recursive: true });
    }

    if (invoice?.invoicePdf?.filePath) {
      const oldPhysicalPath = path.join(
        process.cwd(),
        "public",
        invoice.invoicePdf.filePath.replace(/^\/+/, "")
      );

      if (fs.existsSync(oldPhysicalPath)) {
        fs.unlinkSync(oldPhysicalPath);
      }
    }

    const safeOriginalName = req.file.originalname.replace(/\s+/g, "-");
    const savedFileName = `${Date.now()}-${safeOriginalName}`;
    const physicalFilePath = path.join(invoiceDir, savedFileName);

    fs.writeFileSync(physicalFilePath, req.file.buffer);

    if (invoice) {
      invoice.invoicePdf = {
        filePath: `/uploads/builty/invoice/${savedFileName}`,
        fileName: req.file.originalname,
        uploadedAt: new Date(),
      };
      invoice.totalAmount = total;
      invoice.paidAmount = paid;
      invoice.pendingAmount = pending;
      invoice.paymentStatus = paymentStatus;
      invoice.isActive = true;

      await invoice.save();
    } else {
      invoice = await BuiltyInvoice.create({
        builtyId: builty._id,
        supervisorId: finalSupervisorId,
        invoicePdf: {
          filePath: `/uploads/builty/invoice/${savedFileName}`,
          fileName: req.file.originalname,
          uploadedAt: new Date(),
        },
        totalAmount: total,
        paidAmount: paid,
        pendingAmount: pending,
        paymentStatus,
        isActive: true,
      });
    }

    builty.invoiceId = invoice._id;
    builty.paymentStatus = builtyPaymentStatus;
    await builty.save();

    return res.status(isNewInvoice ? 201 : 200).json({
      message: isNewInvoice  ? "Invoice created successfully" : "Invoice saved/replaced successfully",
      invoice,
      builty,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error creating invoice",
      error: error.message,
    });
  }
};

exports.updateInvoicePaymentStatus = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { invoiceId } = req.params;
    const { paidAmount = 0, paymentStatus } = req.body;

    const invoice = await BuiltyInvoice.findById(invoiceId);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (!["Unpaid", "Partial", "Paid"].includes(paymentStatus)) {
      return res.status(400).json({
        message: "paymentStatus must be Unpaid, Partial or Paid",
      });
    }

    const paid = Number(paidAmount || 0);

    if (paid > invoice.totalAmount) {
      return res.status(400).json({
        message: "paidAmount cannot be greater than totalAmount",
      });
    }

    invoice.paidAmount = paid;
    invoice.pendingAmount = Number(invoice.totalAmount || 0) - paid;
    invoice.paymentStatus = paymentStatus;

    await invoice.save();

    await Builty.findByIdAndUpdate(invoice.builtyId, {
      paymentStatus,
    });

    return res.status(200).json({
      message: "Invoice payment status updated successfully",
      invoice,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error updating invoice payment status",
      error: error.message,
    });
  }
};

exports.getBuiltyInvoice = async (req, res) => {
  try {
    const { builtyId } = req.params;

    const invoice = await BuiltyInvoice.findOne({
      builtyId,
      isActive: true,
    }).sort({ createdAt: -1 });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    return res.status(200).json({
      message: "Invoice fetched successfully",
      invoice,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching invoice",
      error: error.message,
    });
  }
};

exports.getAllBuiltyInvoices = async (req, res) => {
  try {
    if (!["superadmin", "user", "worker"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const {
      page = 1,
      limit = 10,
      search,
      paymentStatus,
      builtyId,
      startDate,
      endDate,
      supervisorId,
    } = req.query;

    const query = {};

    // hierarchy wise filter
    if (req.user.role === "user") {
      query.supervisorId = req.user.id;
    } else if (req.user.role === "worker") {
      query.supervisorId = req.user.supervisor;
    } else if (req.user.role === "superadmin" && supervisorId) {
      query.supervisorId = supervisorId;
    }

    if (builtyId) {
      query.builtyId = builtyId;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (startDate || endDate) {
      query.createdAt = {};

      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (search) {
      query.$or = [
        { invoiceNo: { $regex: search, $options: "i" } },
        { paymentStatus: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [invoices, total] = await Promise.all([
      BuiltyInvoice.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("builtyId")
        .populate("replacedBy", "invoiceNo paymentStatus invoicePdf")
        .lean(),

      BuiltyInvoice.countDocuments(query),
    ]);

    return res.status(200).json({
      message: "Builty invoices fetched successfully",
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
      count: invoices.length,
      invoices,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching builty invoices",
      error: error.message,
    });
  }
};