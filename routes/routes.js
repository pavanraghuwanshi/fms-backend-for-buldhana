const express = require("express");
const router = express.Router();

const driverRoutes = require("./driverRoutes");
const leaveRoutes = require("./leaveRoutes");
const tyreRoutes = require("./tyreRoutes");
const vehicleRoutes = require("./vehicleRoutes");
const extendedVehicleRoutes = require("./extentedVehicleRoutes");
const driverExpenseRoutes = require("./driverExpenseRoutes");
const vehicleExpenseRoutes = require("./vehicleExpensesRoutes");
const driverLoginRoutes = require("./loginRoutes");
const attendenceRoute = require("./attencenceRoute");
const tripRoutes = require("./tripRoute");
const vehicleDocumentRoute = require("./vehicleDocumentsRoute");
const salaryRoute = require("./salaryRoute");
const lorryReceiptRoute = require("./lorryReceiptRoute");
const dailyLogRoutes = require("./dailyLogRoute");
const documentLockerRoute = require("./documentLockerRoute");
const subTripRoutes = require("./subtripRoutes");
const fuelSystemRoute = require("./fuelSystemRoute");
const dashboardRoute = require("./dashboardRoute");
const inspectionRoute = require("./inspectionRoute");
const serviceRoute = require("./serviceRoute");
const userRouter = require("./userRouter");
const helpAndSupportRouter = require("./helpAndSupportRoute");
const workerRouter = require("./workerRoute");
const messageRouter = require("./messageRoute");
const companyRouter = require("./companyRoute");
const dailyTripByDriverRouter = require("./DailyTripByDriverRoute");
const warehouseProductRoute = require("../routes/wareHouseRoute");
const warehouseRoute = require("../routes/wareHouseCountRoute");
const godownLorryReceiptRoute = require("../routes/godownLorryReceiptRoute");
const railheadRoutes  = require('../routes/railheadRoute');
const consignorRoutes = require("../routes/consignorRoutes"); 
const consigneeRoute = require("../routes/consigneeRoute");
const reportRoutes = require("./reportRoutes");
const materialRoutes = require("./materialRoute");
const vehicleMasterRoutes = require("./maintenanceDeviceRoute");
const transporterRoute = require("./transporterRoute");
const commissionAgentRoute = require("./commissionAgentRoute");
const vehicleCategoryRoute = require("./vehicleCategoryRoute");
const builtyRoute = require("./builtyRoute");
const sendWhatsappInvoiceRoute = require("./sendWhatappInvoiceRoute");
const builtyInvoiceRoute = require("./builtyInvoiceRoute");
const locationRoute = require("./locationRoutes");
const vendorRoute = require("./vendorRoutes");
const dailyBuiltyRoute = require("./dailyBuiltyRoute")

router.use("/drivers", driverRoutes);
router.use("/leave", leaveRoutes);
router.use("/tyre", tyreRoutes);
router.use("/vehicle", vehicleRoutes);
router.use("/extendedVehicle", extendedVehicleRoutes);
router.use("/vehicleExpense", vehicleExpenseRoutes);
router.use("/driverExpense", driverExpenseRoutes);
router.use("/driver", driverLoginRoutes);
router.use("/attendance", attendenceRoute);
router.use("/trips", tripRoutes);
router.use("/subtrip", subTripRoutes);
router.use("/vehicle-documents", vehicleDocumentRoute);
router.use("/salary", salaryRoute);
router.use("/lorry-receipt", lorryReceiptRoute);
router.use("/dailylogs", dailyLogRoutes);
router.use("/document-locker", documentLockerRoute);
router.use("/fuelsys", fuelSystemRoute)
router.use("/dashboard", dashboardRoute);
router.use("/inspection", inspectionRoute);
router.use("/service", serviceRoute);
router.use("/user", userRouter);
router.use("/help-and-support", helpAndSupportRouter);
router.use("/worker", workerRouter);
router.use("/message", messageRouter);
router.use("/company", companyRouter);
router.use("/daily", dailyTripByDriverRouter);
router.use("/warehouseproduct", warehouseProductRoute);
router.use("/warehouse", warehouseRoute);
router.use("/godown-lorry-receipt", godownLorryReceiptRoute);
router.use('/railhead', railheadRoutes);
router.use("/consignor", consignorRoutes); 
router.use("/consignee", consigneeRoute);
router.use("/report", reportRoutes);
router.use("/material", materialRoutes);
router.use("/vehicle-master", vehicleMasterRoutes);
router.use("/transporter", transporterRoute);
router.use("/commission-agent", commissionAgentRoute);
router.use("/vehicle-category", vehicleCategoryRoute);
router.use("/builty", builtyRoute);
router.use("/daily-builty", dailyBuiltyRoute);

router.use("/builty-invoice", builtyInvoiceRoute);
router.use("/location", locationRoute);
router.use("/vendor", vendorRoute);




router.use("/send-whatsapp-invoice", sendWhatsappInvoiceRoute);



module.exports = router;