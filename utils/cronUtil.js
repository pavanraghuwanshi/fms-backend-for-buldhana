const cron = require('node-cron');
const Driver = require('../model/driverModel');
const Attendance = require('../model/attendanceModel');
const ServiceOdometer = require('../model/serviceOdometerModel'); // Adjust path to your model
const Device = require('../model/deviceModel'); // Adjust path to your model

// Automatically mark absent at end of day
const markAbsentForMissingAttendance = async () => {
    console.log("Automatically marking absent attendance for users who haven't marked their attendance today.");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    today.setTime(today.getTime() + (5.5 * 60 * 60 * 1000));
    try {
        const users = await Driver.find().select('_id');

        for (const user of users) {
            const existingAttendance = await Attendance.findOne({
                driverId: user._id,
                createdAt: {
                    $gte: today,
                    $lt: new Date(today).setDate(new Date(today).getDate() + 1)
                }
            });

            // If not marked, automatically set to Absent
            if (!existingAttendance) {
                const absentAttendance = new Attendance({
                    driverId: user._id,
                    status: 'Absent'
                });
                await absentAttendance.save();
                // console.log(`Marked Absent for user: ${user._id}`);
            }
        }
    } catch (error) {
        console.error('Error marking absent attendance:', error);
    }
};


// Runs at 7:30 PM IST)
cron.schedule('28 17 * * *', markAbsentForMissingAttendance, {
    timezone: "UTC" // 👈 Force UTC timezone
});

// cron.schedule('	* * * * *', async () => {
//   try { 
//     console.log('Starting odometer update cron job (every minute for testing):', new Date());
//     const id = "6826d231195c8580911bb4b2"
//     const vehicles = await Device.findById(id).select('_id');
    
//       const vehicleId = vehicles._id;

//       // Fetch or create ServiceOdometer record
//       let odometerData = await ServiceOdometer.findOne({ vehicleId });
//       // if (!odometerData) {
//       //   console.log(`No odometer data found for vehicle ${vehicleId}, creating new record`);
//       //   odometerData = new ServiceOdometer({
//       //     vehicleId,
//       //     driverId: null, 
//       //     trip: null, 
//       //     serviceId: null, 
//       //     currentOdometer: 0, 
//       //     lastService: 0, 
//       //     nextServiceDue: null
//       //   });
//       // }

//       const dailyDistance = 100; 
//       odometerData.currentOdometer = (odometerData.currentOdometer || 0) + dailyDistance;

//       await odometerData.save();
//       console.log(`Updated odometer for vehicle ${vehicleId}: ${odometerData.currentOdometer}km`);
 

//     console.log('Odometer update cron job completed successfully');
//   } catch (error) {
//     console.error('Error in odometer update cron job:', error);
//   }
// }, {
//   scheduled: true,
//   timezone: 'Asia/Kolkata'
// });
