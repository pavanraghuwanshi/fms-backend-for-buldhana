const Driver = require("../model/driverModel.js");
const HelpAndSupport = require("../model/helpAndSupport.model.js");
const User = require("../model/userModel.js");

exports.createIssue = async (req, res) => {
    try {
        if (req.user.role !== 'superadmin' && req.user.role !== 'user' && req.user.role !== 'driver') return res.status(403).json({ message: 'Unauthorized access' });
        const { vehicle, ticketType, description } = req.body;
        const user = req.user.id;
        if (!ticketType) return res.status(400).json({ error: 'ticketType are required' });
        if (!description) return res.status(400).json({ error: 'description are required' });

        if (req.user.role === 'superadmin') {
            const newIssue = new HelpAndSupport({ vehicle, ticketType, description });
            await newIssue.save();
            return res.status(201).json({ message: 'Ticket Raised successfully' });
        } else if (req.user.role === 'user') {
            const newIssue = new HelpAndSupport({ user, vehicle, ticketType, description });
            await newIssue.save();
            return res.status(201).json({ message: 'Ticket Raised successfully' });
        } else {
            const driver = await Driver.findById(user).select('supervisor').lean();
            const newIssue = new HelpAndSupport({ driver: user, supervisor: driver.supervisor, vehicle, ticketType, description });
            await newIssue.save();
            return res.status(201).json({ message: 'Ticket Raised successfully' });
        }
    } catch (error) {
        console.error('Error in Ticket Raise:', error);
        return res.status(500).json({ error: 'Internal server error' + error.message });
    }
};

exports.getTickets = async (req, res) => {
    try {
        if (req.user.role !== 'superadmin' && req.user.role !== 'user' && req.user.role !== 'driver') return res.status(403).json({ message: 'Unauthorized access' });

        const userId = req.user.id;
        let tickets;
        if (req.user.role === 'superadmin') {
            tickets = await HelpAndSupport.find().populate('driver', 'name ').lean();

            const userIds = new Set();
            tickets.forEach(ticket => {
                if (ticket.user) {
                    userIds.add(ticket.user.toString()); // only unique IDs will be kept
                } else if (ticket.supervisor) {
                    userIds.add(ticket.supervisor.toString());
                }
            });

            const users = await User.find({ _id: { $in: Array.from(userIds) } }).select('username').lean();
            const userMap = {};
            users.forEach(user => {
                userMap[user._id.toString()] = user.username;
            });

            tickets.forEach(ticket => {
                if (ticket.user) {
                    ticket.supervisor = userMap[ticket.user.toString()] || null;
                    ticket.supervisorId = ticket.user.toString();
                    ticket.user = undefined;
                } else if (ticket.supervisor) {
                    ticket.supervisorId = ticket.supervisor;
                    ticket.supervisor = userMap[ticket.supervisor.toString()] || null;
                }
            });
        }
        else if (req.user.role === 'user') {
            const [fetchedTickets, supervisor] = await Promise.all([
                HelpAndSupport.find({
                    $or: [
                        { user: userId },
                        { supervisor: userId }
                    ]
                }).populate('driver', 'name').lean(),

                User.findById(userId).select('username').lean()
            ]);

            tickets = fetchedTickets;
            if (tickets.length) {
                tickets.forEach(ticket => {
                    ticket.supervisor = supervisor?.username || null;
                });
            }
        }
        else {
            tickets = await HelpAndSupport.find({ driver: userId }).lean();
            const supervisor = await User.findById(tickets[0].supervisor).select('username').lean();
            tickets.length && tickets.forEach(ticket => {
                ticket.supervisor = supervisor.username;
            });
        }

        if (tickets.length === 0) return res.status(404).json({ message: 'No tickets found' });
        return res.status(200).json({ message: 'Tickets fetched successfully', tickets });
    } catch (error) {
        console.error('Error fetching tickets:', error);
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
