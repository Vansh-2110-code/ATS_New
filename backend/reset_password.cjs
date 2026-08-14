const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB...');

  const newPassword = 'Password2026!';
  const hashed = await bcrypt.hash(newPassword, 10);

  const ids = ['WH000001', 'WH000002', 'WH000003', 'WH000010', 'WH000035'];
  for (const empId of ids) {
    const res = await User.updateOne({ employeeId: empId }, { $set: { password: hashed } });
    console.log(`Updated ${empId}:`, res.modifiedCount);
  }

  console.log('\nAll passwords reset to: Password2026!');
  await mongoose.disconnect();
}

run().catch(console.error);
