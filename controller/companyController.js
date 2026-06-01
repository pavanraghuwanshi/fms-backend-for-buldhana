const { default: mongoose } = require("mongoose");
const Company = require("../model/companyModel");
const DigitalSignature = require("../model/digitalSignatureModel");
const { compressImage } = require("../utils/helperFunctions");


exports.createCompany = async (req, res) => {
    try {
        const role = req.user.role;
        if (!["superadmin", "user"].includes(role))
            return res.status(403).json({ message: "Access denied" });

        if (role === "user") req.body.supervisorId = req.user.id;
        if (!req.body.supervisorId)
            return res.status(400).json({ message: "supervisorId is required" });

        const existingCompany = await Company.findOne({
            companyName: req.body.companyName,
        });
        if (existingCompany)
            return res
                .status(400)
                .json({ message: "Company with this name already exists" });

        //  Step 1: Create the company record first
        const company = new Company(req.body);
        await company.save();

        //  Step 2: Handle uploaded file (signatureImage)
        const file = req.files?.["signatureImage"]?.[0];
        let signatureId = null;

        if (file) {
            const mime = file.mimetype;

            if (mime.startsWith("image/")) {
                // compressImage is your existing helper
                const { base64Data, contentType } = await compressImage(file);
                const signature = new DigitalSignature({
                    companyId: company._id,
                    signatureImage: base64Data,
                    contentType,
                });
                await signature.save();
                signatureId = signature._id;
            } else if (mime === "application/pdf") {
                const base64PDF = file.buffer.toString("base64");
                const signature = new DigitalSignature({
                    companyId: company._id,
                    signatureImage: base64PDF,
                    contentType: mime,
                });
                await signature.save();
                signatureId = signature._id;
            } else {
                return res
                    .status(400)
                    .json({ message: "Only image or PDF files are allowed" });
            }

            //  Link digital signature to company
            company.digitalSignatureId = signatureId;
            await company.save();
        } else if (req.body.signatureImage) {
            //  Fallback: in case base64 image was sent in body
            const signature = new DigitalSignature({
                companyId: company._id,
                signatureImage: req.body.signatureImage,
            });
            await signature.save();
            company.digitalSignatureId = signature._id;
            await company.save();
        }

        return res
            .status(201)
            .json({ message: "Company created successfully", company });
    } catch (error) {
        console.error("Error creating company:", error.message);
        return res
            .status(500)
            .json({ message: "Error creating company", error: error.message });
    }
};


exports.getCompanies = async (req, res) => {
    try {
        const role = req.user.role;
        if (!["superadmin", "user","worker"].includes(role)) return res.status(403).json({ message: "Access denied" });
        let filter = {};
        if (role === "user") filter.supervisorId = req.user.id;
        if (role === "superadmin" && req.query.supervisorId) filter.supervisorId = req.query.supervisorId;
        if (role === "worker") filter.supervisorId = req.user.supervisor;

        const companies = await Company.find(filter).lean().select("-__v -createdAt -updatedAt");
        if (companies.length === 0) return res.status(404).json({ message: "No companies found" });
        return res.status(200).json(companies);
    } catch (error) {
        return res.status(500).json({ message: "Error fetching companies" + error.message });
    }
};

exports.getCompanyById = async (req, res) => {
    try {
        if (!["superadmin", "user"].includes(req.user.role)) return res.status(403).json({ message: "Access denied" });
        const company = await Company.findById(req.params.id).lean().select("-__v -createdAt -updatedAt");
        if (!company) return res.status(404).json({ message: "Company not found" });
        return res.status(200).json(company);
    } catch (error) {
        return res.status(500).json({ message: "Error fetching company", error: error.message });
    }
};


exports.updateCompany = async (req, res) => {
    try {
        if (!["superadmin", "user"].includes(req.user.role))
            return res.status(403).json({ message: "Access denied" });

        // Update company basic info
        const company = await Company.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).select("-__v -createdAt -updatedAt");

        if (!company)
            return res.status(404).json({ message: "Company not found" });

        // Handle uploaded file (signatureImage)
        const file = req.files?.["signatureImage"]?.[0];

        if (file) {
            const mime = file.mimetype;
            let base64Data, contentType;

            if (mime.startsWith("image/")) {
                // compressImage is your helper function
                const compressed = await compressImage(file);
                base64Data = compressed.base64Data;
                contentType = compressed.contentType;
            } else if (mime === "application/pdf") {
                base64Data = file.buffer.toString("base64");
                contentType = mime;
            } else {
                return res.status(400).json({ message: "Only image or PDF files are allowed" });
            }

            // Either update or create digital signature record
            let signature = await DigitalSignature.findOne({ companyId: company._id });

            if (signature) {
                signature.signatureImage = base64Data;
                signature.contentType = contentType;
                await signature.save();
            } else {
                signature = new DigitalSignature({
                    companyId: company._id,
                    signatureImage: base64Data,
                    contentType,
                });
                await signature.save();

                company.digitalSignatureId = signature._id;
                await company.save();
            }
        }
        // If signature image sent as base64 (fallback)
        else if (req.body.signatureImage) {
            let signature = await DigitalSignature.findOne({ companyId: company._id });
            if (signature) {
                signature.signatureImage = req.body.signatureImage;
                await signature.save();
            } else {
                signature = new DigitalSignature({
                    companyId: company._id,
                    signatureImage: req.body.signatureImage,
                });
                await signature.save();

                company.digitalSignatureId = signature._id;
                await company.save();
            }
        }

        //  Fetch populated final company data
        const updatedCompany = await Company.findById(company._id)
            .populate("digitalSignatureId", "-__v -createdAt -updatedAt")
            .select("-__v -createdAt -updatedAt");

        return res.status(200).json({
            message: "Company updated successfully",
            company: updatedCompany,
        });

    } catch (error) {
        console.error("Error updating company:", error);
        return res.status(500).json({
            message: "Error updating company",
            error: error.message,
        });
    }
};


exports.deleteCompany = async (req, res) => {
    try {
        if (!["superadmin", "user"].includes(req.user.role)) return res.status(403).json({ message: "Access denied" });
        const company = await Company.findByIdAndDelete(req.params.id);
        if (!company) return res.status(404).json({ message: "Company not found" });
        await DigitalSignature.findOneAndDelete({ companyId: company._id });

        return res.status(200).json({ message: "Company deleted successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Error deleting company" + error.message });
    }
};


exports.getCompanyDigitalSignature = async (req, res) => {
    try {
        const { id } = req.params;
        const ObjectId = new mongoose.Types.ObjectId(id);
        if (!["superadmin", "user","worker"].includes(req.user.role)) return res.status(403).json({ message: "Access denied" });
        const signature = await DigitalSignature.findById(ObjectId)
        if (!signature) return res.status(404).json({ message: "Digital signature not found" });
        return res.status(200).json(signature);
    } catch (error) {
        return res.status(500).json({ message: "Error fetching digital signature" + error.message });
    }
};