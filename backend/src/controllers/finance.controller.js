const mongoose = require('mongoose');
const Salary = require('../models/Salary');
const Revenue = require('../models/Revenue');
const Invoice = require('../models/Invoice');
const CreditNote = require('../models/CreditNote');
const Attendance = require('../models/Attendance');
const Candidate = require('../models/Candidate');
const User = require('../models/User');
const SalaryAccessRequest = require('../models/SalaryAccessRequest');

// GET /api/finance/salary
exports.getSalary = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    let salaries = await Salary.find({ month: m, year: y });

    // Auto-generate salary records if none exist for this month (with upsert to avoid races)
    if (salaries.length === 0) {
      const users = await User.find({ status: 'Active' }).select('name role isWFH');
      const monthStart = new Date(y, m - 1, 1);
      const monthEnd = new Date(y, m, 1);

      const baseSalaries = { recruiter: 18000, tl: 25000, manager: 35000, admin: 30000 };
      const wfhAllowances = { recruiter: 2000, tl: 3000, manager: 4000, admin: 3000 };

      await Promise.all(users.map(async (u) => {
        const presentDays = await Attendance.countDocuments({
          user: u._id,
          date: { $gte: monthStart, $lt: monthEnd },
          status: { $in: ['Present', 'WFH'] },
        });

        // Working days (approx 22 per month)
        const workingDays = 22;
        const base = baseSalaries[u.role] || 18000;
        const wfh = u.isWFH ? (wfhAllowances[u.role] || 2000) : 0;
        const perDayRate = base / workingDays;
        const absentDays = Math.max(0, workingDays - presentDays);
        const deductions = Math.round(absentDays * perDayRate);
        const bonus = presentDays >= workingDays ? Math.round(base * 0.05) : 0;
        const netSalary = base - deductions + bonus + wfh;

        const doc = {
          user: u._id,
          name: u.name,
          role: u.role,
          month: m,
          year: y,
          baseSalary: base,
          wfhAllowance: wfh,
          presentDays,
          workingDays,
          deductions,
          bonus,
          netSalary: Math.max(0, netSalary),
        };
        // Upsert to avoid race condition with concurrent requests
        await Salary.findOneAndUpdate(
          { user: u._id, month: m, year: y },
          { $setOnInsert: doc },
          { upsert: true, new: true }
        );
      }));

      salaries = await Salary.find({ month: m, year: y });
    }

    res.json(salaries);
  } catch (err) {
    next(err);
  }
};

// GET /api/finance/revenue/monthly
exports.getMonthlyRevenue = async (req, res, next) => {
  try {
    const { year } = req.query;
    const y = parseInt(year) || new Date().getFullYear();

    let revenues = await Revenue.find({ year: y }).sort('month');

    // Auto-generate if empty (upsert to avoid race condition)
    if (revenues.length === 0) {
      for (let m = 1; m <= 12; m++) {
        const mStart = new Date(y, m - 1, 1);
        const mEnd = new Date(y, m, 1);
        const joined = await Candidate.countDocuments({ status: 'Joined', updatedAt: { $gte: mStart, $lt: mEnd } });
        const revenue = joined * 25000; // Average placement fee
        
        await Revenue.findOneAndUpdate(
          { month: m, year: y },
          { $setOnInsert: { month: m, year: y, actual: revenue, target: 500000 } },
          { upsert: true, new: true }
        );
      }
      revenues = await Revenue.find({ year: y }).sort('month');
    }

    res.json(revenues);
  } catch (err) {
    next(err);
  }
};

// GET /api/finance/revenue/recruiter-contribution
exports.getRecruiterContribution = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();

    const mStart = new Date(y, m - 1, 1);
    const mEnd = new Date(y, m, 1);

    const recruiters = await User.find({ role: 'recruiter', status: 'Active' }).select('name');
    
    const contributions = await Promise.all(recruiters.map(async (r) => {
      const hires = await Candidate.countDocuments({
        assignedRecruiter: r._id,
        status: 'Joined',
        updatedAt: { $gte: mStart, $lt: mEnd },
      });
      return {
        recruiter: r._id,
        recruiterName: r.name,
        hires,
        amount: hires * 25000,
      };
    }));

    res.json(contributions.filter(c => c.hires > 0).sort((a, b) => b.amount - a.amount));
  } catch (err) {
    next(err);
  }
};

// GET /api/finance/invoices
exports.getInvoices = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [invoices, total] = await Promise.all([
      Invoice.find(query).sort('-createdAt').skip(skip).limit(parseInt(limit))
        .populate('candidateRef', 'name phone')
        .populate('recruiterRef', 'name'),
      Invoice.countDocuments(query),
    ]);

    res.json({ invoices, total });
  } catch (err) {
    next(err);
  }
};

// POST /api/finance/invoices  (Admin only — enforced in route)
exports.createInvoice = async (req, res, next) => {
  try {
    const body = req.body;

    // ── Rich Invoice payload (from CreateInvoicePage) ──────────────
    if (body.invoiceNumber || body.candidates) {
      const invoiceData = {
        invoiceNumber: body.invoiceNumber,
        invoiceDate: body.invoiceDate,
        clientId: body.clientId,
        clientName: body.clientName,
        clientAddress: body.clientAddress,
        clientCity: body.clientCity,
        clientState: body.clientState,
        clientPin: body.clientPin,
        clientCountry: body.clientCountry,
        clientGST: body.clientGST,
        gstNumber: body.gstNumber,
        sacCode: body.sacCode,
        lutArn: body.lutArn,
        lutExpiry: body.lutExpiry ? new Date(body.lutExpiry) : undefined,
        lutApplied: body.lutApplied,
        locationName: body.locationName,
        panNumber: body.panNumber,
        requesterName: body.requesterName,
        candidates: body.candidates || [],
        totalAmount: parseFloat(body.totalAmount) || 0,
        taxType: body.taxType || 'IGST@18',
        igst: parseFloat(body.igst) || 0,
        cgst: parseFloat(body.cgst) || 0,
        sgst: parseFloat(body.sgst) || 0,
        grandTotal: parseFloat(body.grandTotal) || 0,
        amountInWords: body.amountInWords,
        status: body.status || 'Draft',
        // also map to simple fields for backwards compat
        client: body.clientName,
        amount: parseFloat(body.grandTotal) || 0,
        dueDate: body.dueDate ? new Date(body.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // default 30 days
      };

      const invoice = await Invoice.create(invoiceData);

      // Update monthly revenue
      const d = invoiceData.dueDate;
      await Revenue.findOneAndUpdate(
        { month: d.getMonth() + 1, year: d.getFullYear() },
        { $inc: { actual: invoiceData.amount } },
        { upsert: true, new: true }
      );

      return res.status(201).json(invoice);
    }

    // ── Simple payload (from Revenue Entry page) ───────────────────
    const { client, amount, dueDate, status, description, candidateId, recruiterId } = body;

    if (!client || !amount || !dueDate) {
      return res.status(400).json({ message: 'client, amount, and dueDate are required' });
    }

    const invoice = await Invoice.create({
      client,
      amount: parseFloat(amount),
      dueDate: new Date(dueDate),
      status: status || 'Pending',
      description,
      candidateRef: candidateId || undefined,
      recruiterRef: recruiterId || undefined,
    });

    // Update monthly revenue
    const d = new Date(dueDate);
    await Revenue.findOneAndUpdate(
      { month: d.getMonth() + 1, year: d.getFullYear() },
      { $inc: { actual: parseFloat(amount) } },
      { upsert: true, new: true }
    );

    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/finance/invoices/:id
exports.updateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { invoiceNumber, invoiceDate } = req.body;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    if (invoiceNumber && invoiceNumber !== invoice.invoiceNumber) {
      const existing = await Invoice.findOne({ invoiceNumber, _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({ message: 'An invoice with this number already exists' });
      }
      invoice.invoiceNumber = invoiceNumber;
    }

    if (invoiceDate) {
      invoice.invoiceDate = invoiceDate;
      // Note: we're only updating invoiceDate here (which is a string or Date).
      // We aren't changing the internal 'dueDate' used by RevenueEntry unless needed.
    }

    await invoice.save();

    res.json({ message: 'Invoice updated successfully', invoice });
  } catch (err) {
    next(err);
  }
};

// GET /api/finance/invoices/next-number
exports.getNextInvoiceNumber = async (req, res, next) => {
  try {
    const lastInvoice = await Invoice.findOne({ invoiceNumber: { $regex: /^WHM\/IN\// } })
      .sort({ createdAt: -1 })
      .select('invoiceNumber');

    const now = new Date();
    const currentYear = now.getFullYear();
    const nextYear = currentYear + 1;
    const yearPart = `${currentYear % 100}-${nextYear % 100}`;

    let sequence = 1;
    if (lastInvoice && lastInvoice.invoiceNumber) {
      const parts = lastInvoice.invoiceNumber.split('/');
      const lastSequence = parseInt(parts[parts.length - 1]);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }

    const nextNumber = `WHM/IN/${yearPart}/${String(sequence).padStart(3, '0')}`;
    res.json({ nextNumber });
  } catch (err) {
    next(err);
  }
};

// ══════════ Salary Management (Admin Only) ══════════

// POST /api/finance/salary - Create new salary entry
exports.createSalary = async (req, res, next) => {
  try {
    const { userId, name, role, month, year, baseSalary, deductions, bonus, wfhAllowance, adminNotes } = req.body;

    if (!userId || !month || !year || baseSalary === undefined) {
      return res.status(400).json({ message: 'userId, month, year, and baseSalary are required' });
    }

    let resolvedUserId = userId;

    // If userId is not a valid ObjectId, assume it's an employeeId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      let userRecord = await User.findOne({ employeeId: userId });
      if (!userRecord) {
        // Auto-create a basic user record if they typed a brand new employee ID
        userRecord = await User.create({
          name: name || 'Unknown Employee',
          employeeId: userId,
          email: `${userId.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'emp'}@example.com`,
          password: 'password123',
          role: role && ['recruiter', 'tl', 'manager', 'admin', 'spoc', 'walkin'].includes(role.toLowerCase()) ? role.toLowerCase() : 'recruiter'
        });
      }
      resolvedUserId = userRecord._id;
    } else {
      // Just to be safe, make sure user exists
      const userExists = await User.findById(userId);
      if (!userExists) {
        return res.status(404).json({ message: 'User not found' });
      }
    }

    // Check if salary already exists for this user/month/year
    const existing = await Salary.findOne({ user: resolvedUserId, month, year });
    if (existing) {
      return res.status(409).json({ message: 'Salary entry already exists for this month/year' });
    }

    const netSalary = (baseSalary - (deductions || 0) + (bonus || 0) + (wfhAllowance || 0));

    const salary = await Salary.create({
      user: resolvedUserId,
      name,
      role,
      month: parseInt(month),
      year: parseInt(year),
      baseSalary: parseFloat(baseSalary),
      wfhAllowance: parseFloat(wfhAllowance || 0),
      deductions: parseFloat(deductions || 0),
      bonus: parseFloat(bonus || 0),
      netSalary: Math.max(0, netSalary),
      adminNotes,
      isOverridden: true,
      overriddenBy: req.user._id,
      overriddenAt: new Date(),
    });

    res.status(201).json(salary);
  } catch (err) {
    next(err);
  }
};

// PUT /api/finance/salary/:id - Update salary entry
exports.updateSalary = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { baseSalary, deductions, bonus, wfhAllowance, adminNotes, presentDays } = req.body;

    const salary = await Salary.findById(id);
    if (!salary) {
      return res.status(404).json({ message: 'Salary entry not found' });
    }

    // Update fields
    if (baseSalary !== undefined) salary.baseSalary = parseFloat(baseSalary);
    if (deductions !== undefined) salary.deductions = parseFloat(deductions);
    if (bonus !== undefined) salary.bonus = parseFloat(bonus);
    if (wfhAllowance !== undefined) salary.wfhAllowance = parseFloat(wfhAllowance);
    if (presentDays !== undefined) salary.presentDays = parseInt(presentDays);
    if (adminNotes !== undefined) salary.adminNotes = adminNotes;

    // Recalculate net salary
    const totalIncentives = (salary.incentives || []).reduce((sum, inc) => sum + (inc.amount || 0), 0);
    salary.netSalary = Math.max(0, salary.baseSalary - salary.deductions + salary.bonus + salary.wfhAllowance + totalIncentives);

    // Mark as overridden
    salary.isOverridden = true;
    salary.overriddenBy = req.user._id;
    salary.overriddenAt = new Date();

    await salary.save();
    res.json(salary);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/finance/salary/:id - Delete salary entry
exports.deleteSalary = async (req, res, next) => {
  try {
    const { id } = req.params;

    const salary = await Salary.findByIdAndDelete(id);
    if (!salary) {
      return res.status(404).json({ message: 'Salary entry not found' });
    }

    res.json({ message: 'Salary entry deleted', id });
  } catch (err) {
    next(err);
  }
};

// POST /api/finance/salary/:id/incentives - Add incentive to salary
exports.addIncentive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, amount, description, category } = req.body;

    if (!name || amount === undefined) {
      return res.status(400).json({ message: 'name and amount are required' });
    }

    const salary = await Salary.findById(id);
    if (!salary) {
      return res.status(404).json({ message: 'Salary entry not found' });
    }

    const incentive = {
      id: new mongoose.Types.ObjectId(),
      name,
      amount: parseFloat(amount),
      description,
      category: category || 'Incentive',
      addedBy: req.user._id,
      addedAt: new Date(),
    };

    salary.incentives = salary.incentives || [];
    salary.incentives.push(incentive);

    // Recalculate net salary
    const totalIncentives = salary.incentives.reduce((sum, inc) => sum + (inc.amount || 0), 0);
    salary.netSalary = Math.max(0, salary.baseSalary - salary.deductions + salary.bonus + salary.wfhAllowance + totalIncentives);

    await salary.save();
    res.status(201).json(salary);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/finance/salary/:id/incentives/:incentiveId - Remove incentive
exports.removeIncentive = async (req, res, next) => {
  try {
    const { id, incentiveId } = req.params;

    const salary = await Salary.findById(id);
    if (!salary) {
      return res.status(404).json({ message: 'Salary entry not found' });
    }

    salary.incentives = (salary.incentives || []).filter(inc => inc.id.toString() !== incentiveId);

    // Recalculate net salary
    const totalIncentives = salary.incentives.reduce((sum, inc) => sum + (inc.amount || 0), 0);
    salary.netSalary = Math.max(0, salary.baseSalary - salary.deductions + salary.bonus + salary.wfhAllowance + totalIncentives);

    await salary.save();
    res.json(salary);
  } catch (err) {
    next(err);
  }
};

// ══════════ Credit Notes (Admin Only) ══════════

// GET /api/finance/credit-notes - List all credit notes
exports.getCreditNotes = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = {};

    if (status) {
      query.status = status;
    }

    const creditNotes = await CreditNote.find(query)
      .populate('invoiceId', 'invoiceNumber')
      .populate('createdBy', 'name')
      .sort({ noteDate: -1 });

    res.json(creditNotes);
  } catch (err) {
    next(err);
  }
};

// GET /api/finance/credit-notes/:id - Get single credit note
exports.getCreditNote = async (req, res, next) => {
  try {
    const { id } = req.params;

    const creditNote = await CreditNote.findById(id)
      .populate('invoiceId')
      .populate('createdBy', 'name');

    if (!creditNote) {
      return res.status(404).json({ message: 'Credit note not found' });
    }

    res.json(creditNote);
  } catch (err) {
    next(err);
  }
};

// POST /api/finance/credit-notes - Create new credit note (Admin only)
exports.createCreditNote = async (req, res, next) => {
  try {
    const {
      invoiceId,
      invoiceNumber,
      invoiceDate,
      clientName,
      clientAddress,
      clientCity,
      clientState,
      clientPin,
      clientCountry,
      clientGST,
      gstNumber,
      sacCode,
      lutArn,
      lutApplied,
      locationName,
      candidates,
      totalAmount,
      igst,
      grandTotal,
      amountInWords,
      reason,
      noteDate,
    } = req.body;

    // Validation
    if (!invoiceId || !invoiceNumber || !clientName) {
      return res.status(400).json({ message: 'invoiceId, invoiceNumber, and clientName are required' });
    }

    if (!candidates || candidates.length === 0) {
      return res.status(400).json({ message: 'At least 1 candidate required' });
    }

    if (!reason) {
      return res.status(400).json({ message: 'Reason for credit note required' });
    }

    // Check for duplicate credit notes (same invoice + same candidates)
    const candidateIds = candidates.map(c => c.candidateId);
    const existingCreditNote = await CreditNote.findOne({
      invoiceId,
      'candidates.candidateId': { $in: candidateIds },
    });

    if (existingCreditNote) {
      return res.status(400).json({ message: 'Credit note already exists for these candidates from this invoice' });
    }

    // 180-day validation for each candidate
    const validatedCandidates = [];
    for (const cand of candidates) {
      const dbCandidate = await Candidate.findById(cand.candidateId);
      if (!dbCandidate) {
        return res.status(404).json({ message: `Candidate ${cand.name} not found` });
      }

      // Fallback: Joining Date available? If not, use Invoice Date
      // Explicitly check for empty strings or falsy values
      const dojRaw = dbCandidate.offerDetails?.dateOfJoining || dbCandidate.joiningDate || cand.doj || invoiceDate;
      const exitDate = cand.exitDate || dbCandidate.exitDate;

      if (!dojRaw || !exitDate) {
        return res.status(400).json({ message: `Candidate ${cand.name} is missing Joining Date (or Invoice Date fallback) or Exit Date` });
      }

      const dojObj = new Date(dojRaw);
      const exitObj = new Date(exitDate);
      const diffTime = exitObj.getTime() - dojObj.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 180) {
        return res.status(400).json({ message: `Candidate ${cand.name} duration is ${diffDays} days. Credit note only allowed if < 180 days.` });
      }

      // Mark candidate as exited in main DB
      dbCandidate.exitDate = exitDate;
      dbCandidate.status = 'Exited';
      
      // Internally assign Joining Date if missing (Requirement)
      if (!dbCandidate.offerDetails?.dateOfJoining) {
        if (!dbCandidate.offerDetails) dbCandidate.offerDetails = {};
        dbCandidate.offerDetails.dateOfJoining = dojRaw;
      }
      
      await dbCandidate.save();

      // Build internal candidate record for the credit note
      validatedCandidates.push({
        candidateId: cand.candidateId,
        eid: cand.eid,
        name: cand.name,
        doj: dojRaw, // Internally assign the fallback date
        exitDate: exitDate,
        duration: diffDays,
        designation: cand.designation || dbCandidate.designation || '',
        location: cand.location || dbCandidate.location || '',
        amount: cand.amount,
      });
    }

    // Generate credit note number (WHM/CN/YY-YY/XXX)
    const now = new Date();
    const currentYear = now.getFullYear();
    const nextYear = currentYear + 1;
    
    const lastCreditNote = await CreditNote.findOne({
      creditNoteNumber: { $regex: /^WHM\/CN\// }
    })
      .sort({ createdAt: -1 })
      .select('creditNoteNumber');

    let nextSequence = 1;
    if (lastCreditNote && lastCreditNote.creditNoteNumber) {
      const parts = lastCreditNote.creditNoteNumber.split('/');
      const lastNum = parts[parts.length - 1];
      nextSequence = parseInt(lastNum) + 1;
    }

    const creditNoteNumber = `WHM/CN/${currentYear % 100}-${nextYear % 100}/${String(nextSequence).padStart(3, '0')}`;

    // Create credit note
    const creditNote = await CreditNote.create({
      creditNoteNumber,
      noteDate: new Date(noteDate || now),
      invoiceId,
      invoiceNumber,
      invoiceDate: new Date(invoiceDate || noteDate || now),
      clientName,
      clientAddress,
      clientCity,
      clientState,
      clientPin,
      clientCountry,
      clientGST,
      gstNumber,
      sacCode,
      lutArn,
      lutApplied,
      locationName,
      candidates: validatedCandidates,
      totalAmount,
      igst,
      grandTotal,
      amountInWords,
      reason,
      createdBy: req.user._id,
      createdByName: req.user.name,
      status: 'Generated',
    });

    res.status(201).json(creditNote);
  } catch (err) {
    next(err);
  }
};

// GET /api/finance/credit-notes/next-number
exports.getNextCreditNoteNumber = async (req, res, next) => {
  try {
    const lastNote = await CreditNote.findOne({ creditNoteNumber: { $regex: /^WHM\/CN\// } })
      .sort({ createdAt: -1 })
      .select('creditNoteNumber');

    const now = new Date();
    const currentYear = now.getFullYear();
    const nextYear = currentYear + 1;
    const yearPart = `${currentYear % 100}-${nextYear % 100}`;

    let sequence = 1;
    if (lastNote && lastNote.creditNoteNumber) {
      const parts = lastNote.creditNoteNumber.split('/');
      const lastSequence = parseInt(parts[parts.length - 1]);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }

    const nextNumber = `WHM/CN/${yearPart}/${String(sequence).padStart(3, '0')}`;
    res.json({ nextNumber });
  } catch (err) {
    next(err);
  }
};

// PUT /api/finance/credit-notes/:id - Update credit note (Admin only)
exports.updateCreditNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, status } = req.body;

    const creditNote = await CreditNote.findById(id);
    if (!creditNote) {
      return res.status(404).json({ message: 'Credit note not found' });
    }

    // Only allow editing of Draft status
    if (creditNote.status !== 'Draft') {
      return res.status(400).json({ message: 'Can only edit draft credit notes' });
    }

    if (reason) creditNote.reason = reason;
    if (status) creditNote.status = status;

    await creditNote.save();
    res.json(creditNote);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/finance/credit-notes/:id - Delete credit note (Admin only)
exports.deleteCreditNote = async (req, res, next) => {
  try {
    const { id } = req.params;

    const creditNote = await CreditNote.findByIdAndDelete(id);
    if (!creditNote) {
      return res.status(404).json({ message: 'Credit note not found' });
    }

    res.json({ message: 'Credit note deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// ─── Salary Slip Access Control ───

// POST /api/finance/salary-access/request - Request access to salary slip
exports.requestSalaryAccess = async (req, res, next) => {
  try {
    const { month, year, reason, durationDays } = req.body;
    const recruiterId = req.user._id;

    // Validate
    if (!month || !year || !reason) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check for existing pending/approved request
    const existing = await SalaryAccessRequest.findOne({
      recruiterId,
      month,
      year,
      status: { $in: ['Pending', 'Approved'] },
    });

    if (existing) {
      return res.status(400).json({
        message: `You already have a ${existing.status.toLowerCase()} request for this month`,
      });
    }

    const request = new SalaryAccessRequest({
      recruiterId,
      month,
      year,
      reason,
      durationDays: durationDays || 7,
    });

    await request.save();

    res.status(201).json({
      message: 'Access request submitted successfully',
      request,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/finance/salary-access/requests - Get all access requests (Manager/Admin)
exports.getSalaryAccessRequests = async (req, res, next) => {
  try {
    const { status } = req.query;

    let query = {};
    if (status) query.status = status;

    const requests = await SalaryAccessRequest.find(query)
      .populate('recruiterId', 'name email')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });

    // Check and update expired requests
    for (const req of requests) {
      if (req.hasExpired && typeof req.checkAndUpdateExpiry === 'function') {
        await req.checkAndUpdateExpiry();
      }
    }

    res.json({ requests });
  } catch (err) {
    next(err);
  }
};

// PUT /api/finance/salary-access/requests/:id/approve - Approve access request
exports.approveSalaryAccess = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { durationDays } = req.body;
    const managerId = req.user._id;

    const request = await SalaryAccessRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ message: 'Can only approve pending requests' });
    }

    // Set approval details
    request.status = 'Approved';
    request.reviewedBy = managerId;
    request.reviewedAt = new Date();
    request.approvedAt = new Date();

    // Calculate expiry date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (durationDays || request.durationDays));
    request.expiresAt = expiryDate;

    await request.save();

    res.json({
      message: 'Access approved successfully',
      request,
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/finance/salary-access/requests/:id/reject - Reject access request
exports.rejectSalaryAccess = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const managerId = req.user._id;

    if (!rejectionReason) {
      return res.status(400).json({ message: 'Rejection reason required' });
    }

    const request = await SalaryAccessRequest.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.status !== 'Pending') {
      return res.status(400).json({ message: 'Can only reject pending requests' });
    }

    request.status = 'Rejected';
    request.reviewedBy = managerId;
    request.reviewedAt = new Date();
    request.rejectionReason = rejectionReason;

    await request.save();

    res.json({
      message: 'Access rejected successfully',
      request,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/finance/salary-access/check - Check if recruiter has access to salary slip
exports.checkSalarySlipAccess = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const recruiterId = req.user._id;

    if (!month || !year) {
      return res.status(400).json({ message: 'Month and year required' });
    }

    // Check for approved request
    const request = await SalaryAccessRequest.findOne({
      recruiterId,
      month: parseInt(month),
      year: parseInt(year),
      status: 'Approved',
    });

    if (!request) {
      // Check if there's a pending request
      const pendingRequest = await SalaryAccessRequest.findOne({
        recruiterId,
        month: parseInt(month),
        year: parseInt(year),
        status: 'Pending',
      });

      return res.json({
        hasAccess: false,
        hasPendingRequest: !!pendingRequest,
      });
    }

    // Check if access has expired
    if (request.hasExpired()) {
      request.status = 'Expired';
      request.accessRevokedAt = new Date();
      request.accessRevoked = true;
      await request.save();

      return res.json({
        hasAccess: false,
        hasPendingRequest: false,
      });
    }

    res.json({
      hasAccess: true,
      hasPendingRequest: false,
      expiresAt: request.expiresAt,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/finance/salary/download-record - Record a salary slip download
exports.recordSalarySlipDownload = async (req, res, next) => {
  try {
    const { month, year, userId } = req.body;
    const targetUserId = userId && ['admin', 'manager'].includes(req.user.role) ? userId : req.user._id;
    const m = parseInt(month) || (new Date().getMonth() + 1);
    const y = parseInt(year) || new Date().getFullYear();

    let salary = await Salary.findOne({ user: targetUserId, month: m, year: y });
    if (!salary) {
      salary = await Salary.create({
        user: targetUserId,
        name: req.user.name,
        role: req.user.role,
        month: m,
        year: y,
        baseSalary: 18000,
        workingDays: 22,
        presentDays: 22,
        netSalary: 18000,
      });
    }

    salary.downloadCount = (salary.downloadCount || 0) + 1;
    salary.firstDownloadedAt = salary.firstDownloadedAt || new Date();
    salary.downloadLocked = true;
    await salary.save();

    res.json({
      success: true,
      downloadCount: salary.downloadCount,
      firstDownloadedAt: salary.firstDownloadedAt,
      downloadLocked: salary.downloadLocked,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/finance/salary/download-status - Check download status
exports.checkSalarySlipDownload = async (req, res, next) => {
  try {
    const { month, year, userId } = req.query;
    const targetUserId = userId && ['admin', 'manager'].includes(req.user.role) ? userId : req.user._id;
    const m = parseInt(month) || (new Date().getMonth() + 1);
    const y = parseInt(year) || new Date().getFullYear();

    const salary = await Salary.findOne({ user: targetUserId, month: m, year: y });
    if (!salary) {
      return res.json({ downloadCount: 0, downloadLocked: false, firstDownloadedAt: null });
    }

    res.json({
      downloadCount: salary.downloadCount || 0,
      downloadLocked: !!salary.downloadLocked,
      firstDownloadedAt: salary.firstDownloadedAt || null,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/finance/salary/download-reset - Admin unlock download
exports.resetSalarySlipDownload = async (req, res, next) => {
  try {
    const { month, year, userId } = req.body;
    const m = parseInt(month) || (new Date().getMonth() + 1);
    const y = parseInt(year) || new Date().getFullYear();

    const salary = await Salary.findOne({ user: userId, month: m, year: y });
    if (!salary) {
      return res.status(404).json({ message: 'Salary record not found' });
    }

    salary.downloadCount = 0;
    salary.downloadLocked = false;
    await salary.save();

    res.json({ success: true, message: 'Download lock reset successfully' });
  } catch (err) {
    next(err);
  }
};
