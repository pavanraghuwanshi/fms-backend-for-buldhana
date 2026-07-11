const Worker = require("../model/workerModel");
const { encrypt, comparePassword, decrypt } = require("../utils/crypto");
const jwt = require("jsonwebtoken");
const { compressImage } = require("../utils/helperFunctions");
const WorkerProfileImage = require("../model/workerProfileImgModel");

exports.workerLogin = async (req, res) => {
    try {
        const { phone, password } = req.body;
        if (!phone || !password) return res.status(400).json({ message: "Phone and password are required" });
        let worker;
        try {
            worker = await Worker.findOne({ phone });
        } catch (dbError) {
            // This catches the CastError if the input doesn't match the schema type
            return res.status(400).json({
                success: false,
                message: "Invalid credentials"
            });
        }
        if (!worker) {
            return res.status(404).json({ success: false, message: "Worker not found" });
        }
        const isMatch = comparePassword(password, worker.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

        const token = jwt.sign(
            {
                id: worker._id,
                role: "worker",
                supervisor: worker.supervisor,
                supervisorName: worker.supervisorName,
            },
            process.env.JWT_SECRET,
        );

        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            worker: {
                id: worker._id,
                name: worker.name,
                email: worker.email,
                phone: worker.phone,
                supervisor: worker.supervisor,
                supervisorName: worker.supervisorName,
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: "Server error: " + error.message });
    }
};

exports.createWorker = async (req, res) => {
    try {
        let supervisor, supervisorName;
        if (req.user.role === 'superadmin') {
            supervisor = req.body.supervisor;
            supervisorName = req.body.supervisorName.trim();
        } else if (req.user.role === 'user') {
            supervisor = req.user.id;
            supervisorName = req.user.username;
        } else {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (!supervisor || !supervisorName) return res.status(400).json({ message: "Please select Supervisor or SupervisorName" });

        const { name, email, phone, password } = req.body;
        if (!name || !phone || !password) return res.status(400).json({ message: "Name, phone and password are required" });

        let profileImageId = null;
        if (req.file) {
            try {
                const compressed = await compressImage(req.file);
                const savedImage = await WorkerProfileImage.create(compressed);
                profileImageId = savedImage._id;
            } catch (err) {
                console.error("Image save error:", err);
                return res.status(500).json({ message: "Failed to process profile image" });
            }
        }

        const worker = await Worker.create(
            {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                phone, password: encrypt(password),
                profileImage: profileImageId,
                supervisor,
                supervisorName
            });

        worker.password = undefined;
        return res.status(201).json({ success: true, message: "Worker created successfully", worker });
    } catch (error) {
        if (error.code === 11000 && error.keyPattern && error.keyPattern.username) return res.status(400).json({ message: "Branch name already exists" });
        return res.status(500).json({ message: error.message });
    }
};

exports.getWorkers = async (req, res) => {
    try {
        if (!["superadmin", "user"].includes(req.user.role)) return res.status(403).json({ message: "Access denied" });
        let filter = {};
        if (req.user.role === 'user') filter.supervisor = req.user.id;

        const workers = await Worker.find(filter).lean();
        if (workers.length === 0) return res.status(404).json({ message: "No workers found" });

        const workersWithDecryptedPassword = workers.map(worker => ({
            ...worker,
            password: decrypt(worker.password)
        }));

        return res.status(200).json({
            message: "Workers fetched successfully",
            workers: workersWithDecryptedPassword
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error fetching workers",
            error: error.message
        });
    }
};

exports.updateWorker = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, password } = req.body;
        const updateData = {};
        if (name) updateData.name = name.trim();
        if (email) updateData.email = email.trim().toLowerCase();
        if (phone) updateData.phone = phone;
        if (password) updateData.password = encrypt(password);

        if (req.file) {
            try {
                const compressed = await compressImage(req.file);

                const worker = await Worker.findById(id).select("profileImage");
                if (!worker) return res.status(404).json({ message: "Worker not found" });

                if (worker.profileImage) {
                    await WorkerProfileImage.findByIdAndUpdate(worker.profileImage, compressed, { new: true });
                } else {
                    const savedImage = await WorkerProfileImage.create(compressed);
                    updateData.profileImage = savedImage._id;
                }
            } catch (err) {
                console.error("Image update error:", err);
                return res.status(500).json({ message: "Failed to process profile image" });
            }
        }

        if (Object.keys(updateData).length === 0) {
            if (req.file) return res.status(200).json({ message: "Profile image uploaded successfully" });
            return res.status(400).json({ message: "No fields provided for update" });
        }

        const worker = await Worker.findByIdAndUpdate(id, updateData, { new: true });
        if (!worker) return res.status(404).json({ message: "Worker not found" });
        worker.password = undefined;
        return res.status(200).json({
            message: "Worker updated successfully",
            worker,
        });
    } catch (error) {
        return res.status(500).json({ message: "Error updating worker", error: error.message });
    }
};

exports.deleteWorker = async (req, res) => {
    try {
        const { id } = req.params;
        const worker = await Worker.findByIdAndDelete(id);
        if (!worker) return res.status(404).json({ message: "Worker not found" });
        return res.status(200).json({ message: "Worker deleted successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Error deleting worker", error: error.message });
    }
};

exports.getWorkerProfile = async (req, res) => {
    try {
        const role = req.user.role;
        let workerId;
        if (["superadmin", "user", "driver"].includes(role)) workerId = req.query.workerId;
        else workerId = req.user.id;
        if (!workerId) return res.status(400).json({ message: "workerId is required" });

        const worker = await Worker.findById(workerId).select("-notificationAllow -firebaseToken -createdAt -updatedAt -__v").populate('profileImage');
        if (!worker) return res.status(404).json({ message: "worker not found" });
        return res.status(200).json(worker);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

exports.getWorkerProfileImage = async (req, res) => {
    try {
        // const role = req.user.role;
        // let workerId;
        // if (["superadmin", "user", "driver"].includes(role)) workerId = req.query.workerId;
        // else workerId = req.user.id;
        // if (!workerId) return res.status(400).json({ message: "workerId is required" });

        // const worker = await Worker.findById(workerId).select("-notificationAllow -firebaseToken -createdAt -updatedAt -__v").populate('profileImage');
        // if (!worker) return res.status(404).json({ message: "worker not found" });
        // return res.status(200).json(worker);
        const id = req.params.id
        if (!id) return res.status(400).json({ error: "Image ID is required" });
        const profileImage = await WorkerProfileImage.findById(id).lean();
        if (!profileImage) return res.status(404).json({ error: "profileImage not found" });
        return res.status(200).json(profileImage);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
