const BusinessDevelopment = require('../models/BusinessDevelopment');
const ExcelJS = require('exceljs');
const { getDateRange } = require('../utils/helpers');

// Helper to build date and metadata query filter
const buildFilter = (query) => {
  const {
    search,
    clientStatus,
    callStatus,
    serviceOffered,
    executiveName,
    startDate,
    endDate,
    from,
    to,
    range,
    kpiFilter,
  } = query;

  const filter = {};

  if (clientStatus) filter.clientStatus = clientStatus;
  if (callStatus) filter.callStatus = callStatus;
  if (serviceOffered) filter.serviceOffered = serviceOffered;
  if (executiveName) filter.executiveName = { $regex: executiveName, $options: 'i' };

  if (search) {
    const re = { $regex: search, $options: 'i' };
    filter.$or = [
      { companyName: re },
      { contactPerson: re },
      { executiveName: re },
      { city: re },
      { remarks: re },
      { serviceOffered: re },
      { requirement: re },
    ];
  }

  // Date range handling
  const customStart = startDate || from;
  const customEnd = endDate || to;

  if (range && range !== 'all') {
    const { start, end } = getDateRange(range, customStart, customEnd);
    filter.date = { $gte: start, $lt: end };
  } else if (customStart || customEnd) {
    filter.date = {};
    if (customStart) filter.date.$gte = new Date(customStart);
    if (customEnd) {
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      filter.date.$lte = end;
    }
  }

  // KPI card quick drill-down filters
  if (kpiFilter) {
    const todayRange = getDateRange('day');
    const weekRange = getDateRange('week');

    switch (kpiFilter) {
      case 'callsToday':
        filter.date = { $gte: todayRange.start, $lt: todayRange.end };
        break;
      case 'callsThisWeek':
        filter.date = { $gte: weekRange.start, $lt: weekRange.end };
        break;
      case 'connectedCalls':
        filter.callStatus = 'Connected';
        break;
      case 'followUpsDue':
        filter.followUpDate = { $lte: new Date() };
        filter.clientStatus = { $ne: 'Converted' };
        break;
      case 'meetingsScheduled':
        filter.meetingFixed = 'Yes';
        break;
      case 'proposalsPending':
        filter.$or = [
          { proposalSent: 'Pending' },
          { proposalSent: 'No', clientStatus: { $in: ['Hot', 'Warm'] } }
        ];
        break;
      case 'agreementsPending':
        filter.$or = [
          { agreementSent: 'Pending' },
          { agreementSent: 'No', clientStatus: { $in: ['Hot', 'Warm'] } }
        ];
        break;
      case 'hotLeads':
        filter.clientStatus = 'Hot';
        break;
      case 'convertedClients':
        filter.$or = [
          { clientStatus: 'Converted' },
          { callStatus: 'Converted' },
          { callStatus: 'Existing Client' }
        ];
        break;
    }
  }

  return filter;
};

// GET /api/business-development
exports.list = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'date',
      sortOrder = 'desc',
    } = req.query;

    const filter = buildFilter(req.query);
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const total = await BusinessDevelopment.countDocuments(filter);
    const records = await BusinessDevelopment.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    res.json({
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      records,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/business-development/stats
exports.getStats = async (req, res, next) => {
  try {
    const {
      range = 'all',
      startDate,
      endDate,
      from,
      to,
      executiveName,
      serviceOffered,
      clientStatus,
      callStatus,
    } = req.query;

    const baseFilter = {};
    if (executiveName) baseFilter.executiveName = { $regex: executiveName, $options: 'i' };
    if (serviceOffered) baseFilter.serviceOffered = serviceOffered;
    if (clientStatus) baseFilter.clientStatus = clientStatus;
    if (callStatus) baseFilter.callStatus = callStatus;

    const customStart = startDate || from;
    const customEnd = endDate || to;

    let dateFilter = {};
    if (range && range !== 'all') {
      const { start, end } = getDateRange(range, customStart, customEnd);
      dateFilter = { date: { $gte: start, $lt: end } };
    } else if (customStart || customEnd) {
      dateFilter.date = {};
      if (customStart) dateFilter.date.$gte = new Date(customStart);
      if (customEnd) {
        const end = new Date(customEnd);
        end.setHours(23, 59, 59, 999);
        dateFilter.date.$lte = end;
      }
    }

    const todayRange = getDateRange('day');
    const weekRange = getDateRange('week');

    // 1. Calls Today (Always computed for today)
    const callsToday = await BusinessDevelopment.countDocuments({
      ...baseFilter,
      date: { $gte: todayRange.start, $lt: todayRange.end },
    });

    // 2. Calls This Week (Past 7 rolling days)
    const callsThisWeek = await BusinessDevelopment.countDocuments({
      ...baseFilter,
      date: { $gte: weekRange.start, $lt: weekRange.end },
    });

    // Range-aware queries
    const rangeFilter = { ...baseFilter, ...dateFilter };

    // 3. Connected Calls
    const connectedCalls = await BusinessDevelopment.countDocuments({
      ...rangeFilter,
      callStatus: 'Connected',
    });

    // 4. Follow-ups Due
    const followUpsDue = await BusinessDevelopment.countDocuments({
      ...rangeFilter,
      followUpDate: { $lte: new Date() },
      clientStatus: { $ne: 'Converted' },
    });

    // 5. Meetings Scheduled
    const meetingsScheduled = await BusinessDevelopment.countDocuments({
      ...rangeFilter,
      meetingFixed: 'Yes',
    });

    // 6. Proposals Pending
    const proposalsPending = await BusinessDevelopment.countDocuments({
      ...rangeFilter,
      $or: [
        { proposalSent: 'Pending' },
        { proposalSent: 'No', clientStatus: { $in: ['Hot', 'Warm'] } }
      ]
    });

    // 7. Agreements Pending
    const agreementsPending = await BusinessDevelopment.countDocuments({
      ...rangeFilter,
      $or: [
        { agreementSent: 'Pending' },
        { agreementSent: 'No', clientStatus: { $in: ['Hot', 'Warm'] } }
      ]
    });

    // 8. Hot Leads
    const hotLeads = await BusinessDevelopment.countDocuments({
      ...rangeFilter,
      clientStatus: 'Hot',
    });

    // 9. Converted Clients
    const convertedClients = await BusinessDevelopment.countDocuments({
      ...rangeFilter,
      $or: [
        { clientStatus: 'Converted' },
        { callStatus: 'Converted' },
        { callStatus: 'Existing Client' }
      ]
    });

    // 10. Expected Revenue
    const expectedRevenueResult = await BusinessDevelopment.aggregate([
      { $match: { ...rangeFilter, clientStatus: { $in: ['Hot', 'Warm', 'Converted'] } } },
      { $group: { _id: null, total: { $sum: '$expectedRevenue' } } },
    ]);
    const expectedRevenue = expectedRevenueResult[0]?.total || 0;

    // Total Leads within range
    const totalLeads = await BusinessDevelopment.countDocuments(rangeFilter);

    // 11. Conversion %
    const conversionPct = totalLeads > 0 ? Math.round((convertedClients / totalLeads) * 100) : 0;

    // 12. Average Calls/Day within range
    const callsByDay = await BusinessDevelopment.aggregate([
      { $match: rangeFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          count: { $sum: 1 },
        },
      },
    ]);
    const totalDays = callsByDay.length;
    const totalCalls = callsByDay.reduce((sum, day) => sum + day.count, 0);
    const avgCallsPerDay = totalDays > 0
      ? Math.round((totalCalls / totalDays) * 10) / 10
      : (callsToday > 0 ? callsToday : 0);

    res.json({
      callsToday,
      callsThisWeek,
      connectedCalls,
      followUpsDue,
      meetingsScheduled,
      proposalsPending,
      agreementsPending,
      hotLeads,
      convertedClients,
      expectedRevenue,
      conversionPct,
      avgCallsPerDay,
      totalLeads,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/business-development/:id
exports.getOne = async (req, res, next) => {
  try {
    const record = await BusinessDevelopment.findById(req.params.id).lean();
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(record);
  } catch (err) {
    next(err);
  }
};

// POST /api/business-development
exports.create = async (req, res, next) => {
  try {
    const data = { ...req.body, createdBy: req.user._id };
    const record = await BusinessDevelopment.create(data);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
};

// PUT /api/business-development/:id
exports.update = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.createdBy;

    const record = await BusinessDevelopment.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(record);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/business-development/:id
exports.delete = async (req, res, next) => {
  try {
    const record = await BusinessDevelopment.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'Record deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// GET /api/business-development/export
exports.exportExcel = async (req, res, next) => {
  try {
    const filter = buildFilter(req.query);
    const records = await BusinessDevelopment.find(filter).sort({ date: -1 }).lean();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Business Development');

    const columns = [
      { header: 'Sl. No', key: 'slNo', width: 8 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Executive Name', key: 'executiveName', width: 20 },
      { header: 'Company Name', key: 'companyName', width: 25 },
      { header: 'Contact Person', key: 'contactPerson', width: 20 },
      { header: 'Designation', key: 'designation', width: 20 },
      { header: 'Mobile No', key: 'mobileNo', width: 15 },
      { header: 'Email ID', key: 'emailId', width: 25 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'Industry', key: 'industry', width: 15 },
      { header: 'Source', key: 'source', width: 15 },
      { header: 'Service Offered', key: 'serviceOffered', width: 25 },
      { header: 'Call Status', key: 'callStatus', width: 20 },
      { header: 'Interested', key: 'interested', width: 12 },
      { header: 'Requirement', key: 'requirement', width: 25 },
      { header: 'No. of Positions', key: 'noOfPositions', width: 15 },
      { header: 'Follow-up Date', key: 'followUpDate', width: 15 },
      { header: 'Meeting Fixed', key: 'meetingFixed', width: 15 },
      { header: 'Proposal Sent', key: 'proposalSent', width: 15 },
      { header: 'Agreement Sent', key: 'agreementSent', width: 15 },
      { header: 'Client Status', key: 'clientStatus', width: 15 },
      { header: 'Expected Revenue', key: 'expectedRevenue', width: 18 },
      { header: 'Remarks', key: 'remarks', width: 35 },
    ];

    worksheet.columns = columns;

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    const formatDate = (date) => {
      if (!date) return '';
      const d = new Date(date);
      if (isNaN(d.getTime())) return '';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    };

    records.forEach((rec, index) => {
      const rowData = {
        slNo: index + 1,
        date: formatDate(rec.date),
        executiveName: rec.executiveName,
        companyName: rec.companyName,
        contactPerson: rec.contactPerson,
        designation: rec.designation,
        mobileNo: rec.mobileNo,
        emailId: rec.emailId,
        city: rec.city,
        industry: rec.industry,
        source: rec.source,
        serviceOffered: rec.serviceOffered,
        callStatus: rec.callStatus,
        interested: rec.interested,
        requirement: rec.requirement,
        noOfPositions: rec.noOfPositions,
        followUpDate: formatDate(rec.followUpDate),
        meetingFixed: rec.meetingFixed,
        proposalSent: rec.proposalSent,
        agreementSent: rec.agreementSent,
        clientStatus: rec.clientStatus,
        expectedRevenue: rec.expectedRevenue || 0,
        remarks: rec.remarks,
      };

      columns.forEach(col => {
        if (rowData[col.key] === null || rowData[col.key] === undefined) {
          rowData[col.key] = '';
        }
      });

      worksheet.addRow(rowData);
    });

    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length }
    };

    const filename = `Business_Development_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};
