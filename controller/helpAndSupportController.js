const Driver = require("../model/driverModel.js");
const HelpAndSupport = require("../model/helpAndSupport.model.js");
const User = require("../model/userModel.js");
const Worker = require("../model/workerModel");
const Branch = require("../model/branch");
const School = require("../model/school");
const Vendor = require("../model/vendor");
const BranchGroup = require("../model/branchGroup");
exports.createIssue = async (req, res) => {
    try {
       const authorizedRoles = ['superadmin', 'user', 'driver', 'worker','vendor'];
        if (!authorizedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Unauthorized access' });
        }
        const { vehicle, ticketType, description } = req.body;
        const user = req.user.id;
        if (!ticketType) return res.status(400).json({ error: 'ticketType are required' });
        if (!description) return res.status(400).json({ error: 'description are required' });

        if (req.user.role === 'superadmin') {
            const newIssue = new HelpAndSupport({ vehicle, ticketType, description, createdBy: req.user.role });
            await newIssue.save();
            return res.status(201).json({ message: 'Ticket Raised successfully' });
        } else if (req.user.role === 'user') {
            const newIssue = new HelpAndSupport({ user, vehicle, ticketType, description, createdBy: req.user.role });
            await newIssue.save();
            return res.status(201).json({ message: 'Ticket Raised successfully' });
        } else if (req.user.role === 'driver') {
            const driver = await Driver.findById(req.user.id).select('supervisor').lean();
            const newIssue = new HelpAndSupport({
                driver:  req.user.id,
                supervisor: driver?.supervisor,
                vehicle,
                ticketType,
                description,
                createdBy: req.user.role
            });
            const driverdata = await newIssue.save();
            return res.status(201).json({ message: 'Ticket Raised successfully', data: driverdata });
        }
        else if (req.user.role === 'worker') {
            // 3. Logic for 'worker' role
            const worker = await Worker.findById( req.user.id).select('supervisor').lean();
            const newIssue = new HelpAndSupport({
                worker:  req.user.id,
                supervisor: worker?.supervisor,
                vehicle,
                ticketType,
                description,
                createdBy: req.user.role
            });
            const newData = await newIssue.save();
            return res.status(201).json({ message: 'Ticket Raised successfully', data: newData });
        }else if (req.user.role === 'vendor') {
            const vendor = await Vendor.findById(req.user.id).select('supervisorId').lean();
            const newIssue = new HelpAndSupport({
                vendor:  req.user.id,
                supervisor: vendor?.supervisorId, 
                vehicle,
                ticketType,
                description,
                createdBy: req.user.role
            });
            const newData = await newIssue.save();
            return res.status(201).json({ message: 'Ticket Raised successfully', data: newData });
        }
    } catch (error) {
        console.error('Error in Ticket Raise:', error);
        return res.status(500).json({ error: 'Internal server error' + error.message });
    }
};


const attachSupervisorNames = async (tickets) => {
    const idsToLookup = new Set();
    tickets.forEach(t => {
        if (t.supervisor) idsToLookup.add(t.supervisor.toString());
        if (t.user) idsToLookup.add(t.user.toString());
    });

    if (idsToLookup.size === 0) return tickets;

    const idArray = Array.from(idsToLookup);

    // 2. Fetch from all collections
    const [users, branches, schools, groups] = await Promise.all([
        User.find({ _id: { $in: idArray } }).select('username').lean(),
        Branch.find({ _id: { $in: idArray } }).select('username').lean(),
        School.find({ _id: { $in: idArray } }).select('username').lean(),
        BranchGroup.find({ _id: { $in: idArray } }).select('username').lean()
    ]);

    const allEntities = [...users, ...branches, ...schools, ...groups];
    const entityMap = new Map(allEntities.map(e => [e._id.toString(), e.username]));

    // 3. Map names back
    return tickets.map(ticket => {
        // Determine the ID to look up (prioritize supervisor, fallback to user)
        const lookupId = (ticket.supervisor || ticket.user)?.toString();
        
        return {
            ...ticket,
            supervisorName: lookupId 
                ? (entityMap.get(lookupId) || "Unknown") 
                : "No Supervisor Assigned"
        };
    });
};
exports.getTickets = async (req, res) => {
    try {
        const { id: userId, role } = req.user;
        
        // 1. Build Query
        let query = {};
        if (role === 'user') {
            query = { $or: [{ user: userId }, { supervisor: userId }] };
        } else if (role === 'driver') {
            query = { driver: userId };
        } else if (role === 'worker') {
            query = { worker: userId };
        } else if (role === 'vendor') {
            query = { vendor: userId };
        }else if (role !== 'superadmin') {
            return res.status(403).json({ message: 'Unauthorized access' });
        }

        // 2. Fetch Tickets
        let tickets = await HelpAndSupport.find(query)
            .populate('driver', 'name')
            .populate('worker', 'name')
            .populate('vendor', 'vendorName')
            .lean();

        if (!tickets || tickets.length === 0) {
            return res.status(404).json({ message: 'No tickets found' });
        }

        // 3. Attach Supervisor Names
        const formattedTickets = await attachSupervisorNames(tickets);

        return res.status(200).json({ 
            message: 'Tickets fetched successfully', 
            tickets: formattedTickets 
        });
    } catch (error) {
        return res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
};

exports.updateTicket = async (req, res) => {
    try {
        if (req.user.role !== 'superadmin') return res.status(403).json({ message: 'Unauthorized access' });
        const { id } = req.params;
        const { vehicle, ticketType, description, status, feedback } = req.body;

        const ticket = await HelpAndSupport.findById(id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        if (vehicle !== undefined) ticket.vehicle = vehicle;
        if (ticketType !== undefined) ticket.ticketType = ticketType;
        if (description !== undefined) ticket.description = description;
        if (status !== undefined) ticket.status = status;
        if (feedback !== undefined) ticket.feedback = feedback;

        await ticket.save();
        return res.status(200).json({ message: 'Ticket updated successfully', ticket });
    } catch (error) {
        console.error('Error updating ticket:', error);
        return res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
};

exports.getPendingTickets = async (req, res) => {
    try {
        if (req.user.role !== 'superadmin') return res.status(403).json({ message: 'Unauthorized access' });
        const tickets = await HelpAndSupport.find({ status: 'Pending' }).populate('driver', 'name').lean();
        if (tickets.length === 0) return res.status(404).json({ message: 'No pending tickets found' });

        return res.status(200).json({ message: 'Pending tickets fetched successfully', tickets });
    } catch (error) {
        console.error('Error fetching pending tickets:', error);
        return res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
};
