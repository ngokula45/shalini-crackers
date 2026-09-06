/**
 * Creates the first admin user for the Cracker Shop backend.
 *
 * Usage:
 *   cd backend
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=someStrongPassword npm run seed:admin
 *
 * Or set ADMIN_EMAIL / ADMIN_PASSWORD in backend/.env and just run:
 *   npm run seed:admin
 *
 * The plaintext password is read from the environment only, is hashed with
 * bcrypt before being stored, and is NEVER logged or written to any file.
 */
import 'dotenv/config';
import * as dns from 'node:dns';
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';

const dnsServers = (process.env.DNS_SERVERS || '')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean);

if (dnsServers.length > 0) {
  dns.setServers(dnsServers);
}

async function run() {
  const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cracker_shop';
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || '';
  const name = process.env.ADMIN_NAME || 'Admin';
  const resetPassword = process.env.ADMIN_RESET_PASSWORD === 'true';

  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in the environment.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  await mongoose.connect(mongodbUri);

  const adminSchema = new mongoose.Schema(
    {
      name: String,
      email: { type: String, unique: true, lowercase: true },
      passwordHash: String,
      role: { type: String, default: 'admin' },
      isActive: { type: Boolean, default: true },
    },
    { timestamps: true, collection: 'admins' },
  );
  const AdminModel = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

  const existing = await AdminModel.findOne({ email });
  if (existing) {
    if (resetPassword) {
      existing.passwordHash = await bcrypt.hash(password, 12);
      existing.name = name;
      existing.isActive = true;
      await existing.save();
      console.log(`Admin password reset: ${email}`);
    } else {
      console.log(`Admin with email ${email} already exists — no changes made.`);
    }
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await AdminModel.create({ name, email, passwordHash, role: 'admin', isActive: true });

  console.log(`Admin user created: ${email}`);
  console.log('(Password was not logged or stored anywhere in plaintext.)');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Failed to seed admin:', err.message);
  process.exit(1);
});
