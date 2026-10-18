import assert from 'node:assert';
import http from 'node:http';
import express from 'express';
import { inMemoryStore, recordPrivacyRequest } from '../server/db';
import { authenticateToken } from '../server/authMiddleware';
import adminRoutes from '../server/routes/adminRoutes';

process.env.UNIT_TEST = 'true';

async function runGrievanceTests() {
  console.log('--- TESTING ADMIN GRIEVANCE & PRIVACY REQUEST ROUTES ---');

  const app = express();
  app.use(express.json());
  app.use(authenticateToken);
  app.use('/api/admin', adminRoutes);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const customerId = 'cust-grv-01';
  inMemoryStore.profiles.set(customerId, {
    id: customerId,
    phone: '9876543210',
    full_name: 'Customer One',
    role: 'CUSTOMER',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  const customerToken = Buffer.from(JSON.stringify({ sub: customerId, id: customerId })).toString('base64');

  const adminId = 'admin-grv-01';
  inMemoryStore.profiles.set(adminId, {
    id: adminId,
    phone: '9161110030',
    full_name: 'Grievance Admin',
    role: 'ADMIN',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  const adminToken = Buffer.from(JSON.stringify({ sub: adminId, id: adminId })).toString('base64');

  try {
    // 1. Customer cannot access grievances
    const resCust = await fetch(`${baseUrl}/api/admin/privacy-requests`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.strictEqual(resCust.status, 403, 'Customer must receive 403');
    console.log('PASS: Customer blocked from /api/admin/privacy-requests (403)');

    // 2. Insert test grievance
    const sample = await recordPrivacyRequest({
      userId: customerId,
      customerName: 'Aarav Sharma',
      customerEmail: 'aarav@example.com',
      customerPhone: '+91 98765 43210',
      requestType: 'GRIEVANCE',
      details: 'Mithai box packaging was slightly damaged during express transit.',
    });

    // 3. Admin can list grievances
    const resAdmin = await fetch(`${baseUrl}/api/admin/privacy-requests`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(resAdmin.status, 200, 'Admin must receive 200');
    const adminData = await resAdmin.json();
    assert.strictEqual(adminData.success, true);
    const found = adminData.requests.find((r: any) => r.id === sample.id);
    assert.ok(found, 'Grievance ticket must be found in admin response');
    assert.strictEqual(found.ticketNumber, sample.ticketNumber);
    console.log(`PASS: Admin listed grievances (200), found ticket ${sample.ticketNumber}`);

    // 4. Invalid status returns 400
    const resInvalid = await fetch(`${baseUrl}/api/admin/privacy-requests/${sample.id}/status`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'INVALID_STATUS' }),
    });
    assert.strictEqual(resInvalid.status, 400);
    console.log('PASS: Invalid status rejected (400)');

    // 5. Admin updates status to IN_REVIEW with resolution notes
    const resUpdate = await fetch(`${baseUrl}/api/admin/privacy-requests/${sample.id}/status`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'IN_REVIEW',
        resolution_notes: 'Contacted logistics partner and dispatched fresh replacement box.',
      }),
    });
    assert.strictEqual(resUpdate.status, 200);
    const updateData = await resUpdate.json();
    assert.strictEqual(updateData.success, true);
    assert.strictEqual(updateData.request.status, 'IN_REVIEW');
    assert.strictEqual(
      updateData.request.resolutionNotes,
      'Contacted logistics partner and dispatched fresh replacement box.'
    );
    console.log('PASS: Admin updated grievance status to IN_REVIEW with resolution notes');

    console.log('ALL GRIEVANCE VERIFICATION TESTS PASSED SUCCESSFULLY');
  } finally {
    server.close();
  }
}

runGrievanceTests().catch((err) => {
  console.error(err);
  process.exit(1);
});

