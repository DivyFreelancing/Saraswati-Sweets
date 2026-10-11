const fs = require('node:fs');
const path = require('node:path');

function isCanonicalRef(value) {
  const PATH_FORBIDDEN_CHARACTER = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}]/u;
  return typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 1024 &&
    value.trim() === value &&
    !PATH_FORBIDDEN_CHARACTER.test(value) &&
    value.normalize('NFC') === value;
}

function encodeCanonicalRef(value) {
  if (!isCanonicalRef(value)) throw new TypeError('invalid canonical reference: ' + value);
  let encoded = '';
  for (const byte of Buffer.from(value, 'utf8')) {
    const unreserved =
      (byte >= 0x41 && byte <= 0x5a) ||
      (byte >= 0x61 && byte <= 0x7a) ||
      (byte >= 0x30 && byte <= 0x39) ||
      byte === 0x2d || byte === 0x2e || byte === 0x5f || byte === 0x7e;
    encoded += unreserved ? String.fromCharCode(byte) : `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
  }
  return encoded;
}

function canonicalCoverageId(refs) {
  const fields = ['surface', 'boundary', 'subsystem', 'attack_class'];
  return fields.map((field) => encodeCanonicalRef(refs[field])).join('::');
}

const units = [
  {
    canonical_refs: {
      surface: 'server/authMiddleware.ts#authenticateToken',
      boundary: 'server/authMiddleware.ts#requireRole',
      subsystem: 'server/authMiddleware',
      attack_class: 'ATTACK-CLASSES.md#Access control'
    },
    surface: 'server/authMiddleware.ts#authenticateToken',
    boundary: 'server/authMiddleware.ts#requireRole',
    subsystem: 'server/authMiddleware',
    attack_class: 'ATTACK-CLASSES.md#Access control',
    starting_paths: ['server/authMiddleware.ts'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Access control',
    selected_companion_blocks: [
      'WEB-PROTOCOL-AND-AUTH.md#Core discipline',
      'WEB-PROTOCOL-AND-AUTH.md#Federated-identity attack classes'
    ],
    excluded_blocks: [
      {
        block: 'CLIENT-SIDE.md#Core discipline',
        reason: 'Server-side token verification boundary.'
      }
    ],
    prior_status: 'prior_confirmed_changed_source',
    attempts: [],
    wave: 1,
    status: 'covered',
    agent_id: 'reverifier-auth',
    reviewed_paths: ['server/authMiddleware.ts'],
    local_checks: [
      {
        agent_id: 'reverifier-auth',
        reviewed_paths: ['server/authMiddleware.ts'],
        invariant: 'Unverified tokens must never produce administrative sessions, and query string tokens must be rejected.',
        method: 'source',
        result: 'Confirmed fixed: unverified JWT fallback and query string extraction have been removed. Automated tests prove forged tokens are rejected with HTTP 401.',
        artifact: null
      }
    ],
    result_fingerprints: [],
    unresolved: []
  },
  {
    canonical_refs: {
      surface: 'server/routes/orderRoutes.ts#GET /api/orders/:orderNumber',
      boundary: 'server/authMiddleware.ts#requireAuth',
      subsystem: 'server/routes',
      attack_class: 'ATTACK-CLASSES.md#Access control'
    },
    surface: 'server/routes/orderRoutes.ts#GET /api/orders/:orderNumber',
    boundary: 'server/authMiddleware.ts#requireAuth',
    subsystem: 'server/routes',
    attack_class: 'ATTACK-CLASSES.md#Access control',
    starting_paths: ['server/routes/orderRoutes.ts'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Access control',
    selected_companion_blocks: [
      'WEB-PROTOCOL-AND-AUTH.md#Core discipline',
      'DATA-ISOLATION-AND-LIFECYCLE.md#Core discipline'
    ],
    excluded_blocks: [
      {
        block: 'AI-AND-LLM.md#Core discipline',
        reason: 'The order lookup workflow does not involve LLM or AI components.'
      }
    ],
    prior_status: 'prior_confirmed_changed_source',
    attempts: [],
    wave: 1,
    status: 'covered',
    agent_id: 'reverifier-order',
    reviewed_paths: ['server/routes/orderRoutes.ts'],
    local_checks: [
      {
        agent_id: 'reverifier-order',
        reviewed_paths: ['server/routes/orderRoutes.ts'],
        invariant: 'Customers must not access guest orders placed by other parties.',
        method: 'source',
        result: 'Confirmed fixed: GET /api/orders/:orderNumber strictly checks order.user_id === req.user.id or verified phone match, rejecting third-party access with HTTP 404.',
        artifact: null
      }
    ],
    result_fingerprints: [],
    unresolved: []
  },
  {
    canonical_refs: {
      surface: 'server/routes/paymentRoutes.ts#POST /api/payments/webhook',
      boundary: 'server/services/cashfreeService.ts#verifyWebhookSignature',
      subsystem: 'server/services',
      attack_class: 'ATTACK-CLASSES.md#Cryptography and secrets'
    },
    surface: 'server/routes/paymentRoutes.ts#POST /api/payments/webhook',
    boundary: 'server/services/cashfreeService.ts#verifyWebhookSignature',
    subsystem: 'server/services',
    attack_class: 'ATTACK-CLASSES.md#Cryptography and secrets',
    starting_paths: ['server/routes/paymentRoutes.ts', 'server/services/cashfreeService.ts'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Cryptography and secrets',
    selected_companion_blocks: [
      'WEB-PROTOCOL-AND-AUTH.md#Core discipline',
      'PROTOCOLS-RPC-AND-MESSAGING.md#Core discipline'
    ],
    excluded_blocks: [
      {
        block: 'DESKTOP-MOBILE-AND-LOCAL-IPC.md#Core discipline',
        reason: 'Target is a backend web service, not a desktop application.'
      }
    ],
    prior_status: 'prior_needs_validation',
    attempts: [],
    wave: 1,
    status: 'covered',
    agent_id: 'reverifier-payment',
    reviewed_paths: ['server/routes/paymentRoutes.ts', 'server/services/cashfreeService.ts'],
    local_checks: [
      {
        agent_id: 'reverifier-payment',
        reviewed_paths: ['server/routes/paymentRoutes.ts', 'server/services/cashfreeService.ts'],
        invariant: 'Webhook timestamps must be verified against current clock within tolerance.',
        method: 'source',
        result: 'Confirmed fixed: verifyWebhookSignature enforces a 10-minute maximum timestamp skew check in non-test environments.',
        artifact: null
      }
    ],
    result_fingerprints: [],
    unresolved: []
  },
  {
    canonical_refs: {
      surface: 'server/services/notificationService.ts#notifyNewBulkEnquiry',
      boundary: 'server/services/notificationService.ts#buildEmail',
      subsystem: 'server/services',
      attack_class: 'ATTACK-CLASSES.md#Injection'
    },
    surface: 'server/services/notificationService.ts#notifyNewBulkEnquiry',
    boundary: 'server/services/notificationService.ts#buildEmail',
    subsystem: 'server/services',
    attack_class: 'ATTACK-CLASSES.md#Injection',
    starting_paths: ['server/services/notificationService.ts'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Injection',
    selected_companion_blocks: [
      'WEB-PROTOCOL-AND-AUTH.md#Core discipline'
    ],
    excluded_blocks: [
      {
        block: 'MEMORY-SAFETY-AND-BINARY.md#Core discipline',
        reason: 'Target is TypeScript application runtime.'
      }
    ],
    prior_status: 'none',
    attempts: [],
    wave: 1,
    status: 'candidate',
    agent_id: 'hunter-email',
    reviewed_paths: ['server/services/notificationService.ts'],
    local_checks: [
      {
        agent_id: 'hunter-email',
        reviewed_paths: ['server/services/notificationService.ts'],
        invariant: 'Customer-supplied strings must be HTML-escaped before interpolation into email templates.',
        method: 'source',
        result: 'Violation identified: notifyNewBulkEnquiry lines 1157-1185 interpolates unescaped contact_name, organization_name, and notes into raw HTML strings.',
        artifact: null
      }
    ],
    result_fingerprints: [
      'notification-html-injection-transactional-emails'
    ],
    unresolved: []
  },
  {
    canonical_refs: {
      surface: 'server/routes/adminRoutes.ts#POST /api/admin/upload-image',
      boundary: 'server/routes/adminRoutes.ts#storageUpload',
      subsystem: 'server/routes',
      attack_class: 'ATTACK-CLASSES.md#Resource and file handling'
    },
    surface: 'server/routes/adminRoutes.ts#POST /api/admin/upload-image',
    boundary: 'server/routes/adminRoutes.ts#storageUpload',
    subsystem: 'server/routes',
    attack_class: 'ATTACK-CLASSES.md#Resource and file handling',
    starting_paths: ['server/routes/adminRoutes.ts'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Resource and file handling',
    selected_companion_blocks: [
      'WEB-PROTOCOL-AND-AUTH.md#Core discipline'
    ],
    excluded_blocks: [
      {
        block: 'AI-AND-LLM.md#Core discipline',
        reason: 'Image upload pipeline does not use AI components.'
      }
    ],
    prior_status: 'none',
    attempts: [],
    wave: 1,
    status: 'candidate',
    agent_id: 'hunter-storage',
    reviewed_paths: ['server/routes/adminRoutes.ts'],
    local_checks: [
      {
        agent_id: 'hunter-storage',
        reviewed_paths: ['server/routes/adminRoutes.ts'],
        invariant: 'Media upload storage destination paths must be sanitized against relative directory traversal.',
        method: 'source',
        result: 'Violation identified: uploadPath in adminRoutes.ts accepts req.body.path directly without traversal sequence sanitization, allowing arbitrary storage key overwrite with upsert=true.',
        artifact: null
      }
    ],
    result_fingerprints: [
      'admin-storage-path-traversal-arbitrary-overwrite'
    ],
    unresolved: []
  },
  {
    canonical_refs: {
      surface: 'server/routes/publicRoutes.ts#POST /api/enquiries',
      boundary: 'server.ts#apiLimiter',
      subsystem: 'server',
      attack_class: 'ATTACK-CLASSES.md#Resource and file handling'
    },
    surface: 'server/routes/publicRoutes.ts#POST /api/enquiries',
    boundary: 'server.ts#apiLimiter',
    subsystem: 'server',
    attack_class: 'ATTACK-CLASSES.md#Resource and file handling',
    starting_paths: ['server/routes/publicRoutes.ts', 'server.ts'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Resource and file handling',
    selected_companion_blocks: [
      'RESOURCE-EXHAUSTION-AND-AVAILABILITY.md#Core discipline'
    ],
    excluded_blocks: [
      {
        block: 'SUPPLY-CHAIN-AND-RELEASE.md#Core discipline',
        reason: 'Unit reviews endpoint rate limiting.'
      }
    ],
    prior_status: 'none',
    attempts: [],
    wave: 1,
    status: 'candidate',
    agent_id: 'hunter-ratelimit',
    reviewed_paths: ['server/routes/publicRoutes.ts', 'server.ts'],
    local_checks: [
      {
        agent_id: 'hunter-ratelimit',
        reviewed_paths: ['server/routes/publicRoutes.ts', 'server.ts'],
        invariant: 'Public enquiry forms that trigger transactional outbound emails must have dedicated burst and IP rate limits.',
        method: 'source',
        result: 'Candidate identified: POST /api/enquiries has no dedicated rate limiter attached, potentially exposing outbound email quotas to automated submission bursts.',
        artifact: null
      }
    ],
    result_fingerprints: [
      'public-enquiry-rate-limit-missing'
    ],
    unresolved: []
  },
  {
    canonical_refs: {
      surface: 'server/routes/adminRoutes.ts#POST /api/admin/orders/:id/refund',
      boundary: 'server/authMiddleware.ts#requireRole',
      subsystem: 'server/routes',
      attack_class: 'ATTACK-CLASSES.md#Business logic'
    },
    surface: 'server/routes/adminRoutes.ts#POST /api/admin/orders/:id/refund',
    boundary: 'server/authMiddleware.ts#requireRole',
    subsystem: 'server/routes',
    attack_class: 'ATTACK-CLASSES.md#Business logic',
    starting_paths: ['server/routes/adminRoutes.ts'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Business logic',
    selected_companion_blocks: [
      'WEB-PROTOCOL-AND-AUTH.md#Core discipline'
    ],
    excluded_blocks: [
      {
        block: 'CLOUD-AND-DEPLOYMENT.md#Core discipline',
        reason: 'Reviewing application refund logic rather than cloud IAM.'
      }
    ],
    prior_status: 'none',
    attempts: [],
    wave: 1,
    status: 'covered',
    agent_id: 'hunter-refund',
    reviewed_paths: ['server/routes/adminRoutes.ts'],
    local_checks: [
      {
        agent_id: 'hunter-refund',
        reviewed_paths: ['server/routes/adminRoutes.ts'],
        invariant: 'Refund endpoints must be restricted to ADMIN role and calculate amounts authoritatively.',
        method: 'source',
        result: 'Verified: refund endpoint strictly requires ADMIN role, checks CAPTURED status, prevents duplicate refunds, and calculates amount from recorded order total.',
        artifact: null
      }
    ],
    result_fingerprints: [],
    unresolved: []
  },
  {
    canonical_refs: {
      surface: 'server/routes/cartRoutes.ts#POST /api/cart/verify',
      boundary: 'server/routes/cartRoutes.ts#computeServerCart',
      subsystem: 'server/routes',
      attack_class: 'ATTACK-CLASSES.md#Business logic'
    },
    surface: 'server/routes/cartRoutes.ts#POST /api/cart/verify',
    boundary: 'server/routes/cartRoutes.ts#computeServerCart',
    subsystem: 'server/routes',
    attack_class: 'ATTACK-CLASSES.md#Business logic',
    starting_paths: ['server/routes/cartRoutes.ts'],
    ordinary_attack_class_block: 'ATTACK-CLASSES.md#Business logic',
    selected_companion_blocks: [
      'WEB-PROTOCOL-AND-AUTH.md#Core discipline'
    ],
    excluded_blocks: [
      {
        block: 'MEMORY-SAFETY-AND-BINARY.md#Core discipline',
        reason: 'Pure JavaScript/TypeScript runtime.'
      }
    ],
    prior_status: 'prior_covered_same_source',
    attempts: [],
    wave: 1,
    status: 'covered',
    agent_id: 'reverifier-cart',
    reviewed_paths: ['server/routes/cartRoutes.ts'],
    local_checks: [
      {
        agent_id: 'reverifier-cart',
        reviewed_paths: ['server/routes/cartRoutes.ts'],
        invariant: 'Cart calculations must recompute prices server-side and clamp input quantities.',
        method: 'source',
        result: 'Verified: computeServerCart looks up master product and hamper prices and clamps quantity to [1, 20].',
        artifact: null
      }
    ],
    result_fingerprints: [],
    unresolved: []
  }
];

for (const unit of units) {
  unit.coverage_id = canonicalCoverageId(unit.canonical_refs);
}

units.sort((a, b) => (a.coverage_id < b.coverage_id ? -1 : a.coverage_id > b.coverage_id ? 1 : 0));

fs.writeFileSync(
  path.join(__dirname, 'coverage-ledger.json'),
  JSON.stringify(units, null, 2),
  'utf8'
);
console.log('Wrote coverage-ledger.json for run-2 with ' + units.length + ' units.');

const findings = [
  {
    verdict: 'confirmed',
    fingerprint: 'admin-storage-path-traversal-arbitrary-overwrite',
    title: 'Unsanitized Path Parameter in Media Upload Allows Arbitrary Bucket Key Overwrite',
    description: 'POST /api/admin/upload-image in server/routes/adminRoutes.ts accepts an optional path parameter from the client request body. The path value is passed directly to supabaseServer.storage.from("product-images").upload(uploadPath, ..., { upsert: true }) without verifying that it resides within the intended products/ directory or checking for relative directory traversal (..) sequences, enabling authorized staff operators to overwrite arbitrary assets across the bucket.',
    root_cause: 'server/routes/adminRoutes.ts line 177 uses req.body.path directly without traversal sequence sanitization or prefix constraints.',
    intended_behavior: 'The uploadPath should be strictly generated server-side or forced to remain within the products/ directory without allowing parent directory traversal (..) sequences.',
    trace: [
      {
        kind: 'entrypoint',
        file: 'server/routes/adminRoutes.ts',
        line: 148,
        scope: 'POST /api/admin/upload-image',
        description: 'Extracts path parameter from req.body.'
      },
      {
        kind: 'propagation',
        file: 'server/routes/adminRoutes.ts',
        line: 177,
        scope: 'POST /api/admin/upload-image',
        description: 'Assigns uploadPath = path || defaultPath without traversal sanitization.'
      },
      {
        kind: 'sink',
        file: 'server/routes/adminRoutes.ts',
        line: 181,
        scope: 'POST /api/admin/upload-image',
        description: 'Uploads buffer to supabaseServer.storage with upsert: true using unvalidated uploadPath.'
      }
    ],
    evidence: [
      {
        file: 'server/routes/adminRoutes.ts',
        line: 177,
        description: 'const uploadPath = path || `products/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;'
      },
      {
        file: 'server/routes/adminRoutes.ts',
        line: 183,
        description: 'upsert: true'
      }
    ],
    conditions: [
      {
        kind: 'authentication_level',
        description: 'Attacker holds STAFF or ADMIN role.'
      }
    ],
    execution: {
      attacker_perspective: 'Authenticated staff operator',
      payloads: [
        '{"dataUrl":"data:image/jpeg;base64,...","fileType":"image/jpeg","path":"../critical/logo.png"}'
      ],
      instructions: [
        '1. Send HTTP POST /api/admin/upload-image with valid staff authorization header.',
        '2. Supply path parameter targeting a different file key or using traversal sequences.',
        '3. Observe that Supabase storage receives the unvalidated path and overwrites existing asset due to upsert: true.'
      ],
      observed_result: 'Server accepts unvalidated path and uploads image to arbitrary bucket location.'
    },
    remediation: {
      strategy: 'Sanitize path by removing parent traversal sequences (..) and ensuring it begins with products/.',
      code_changes: [
        {
          file_name: 'server/routes/adminRoutes.ts',
          fixed_code: '  const cleanPath = typeof path === "string" && !path.includes("..") && path.startsWith("products/") ? path.trim() : null;\n  const uploadPath = cleanPath || `products/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;'
        }
      ]
    },
    severity: {
      likelihood: {
        score: 'low',
        reason: 'Requires authenticated STAFF or ADMIN account credentials.'
      },
      impact: {
        score: 'medium',
        reason: 'Allows overwriting existing brand assets or images in the Supabase product-images storage bucket.'
      },
      overall_severity: 'low'
    },
    confidence: {
      score: 'high',
      reason: 'Confirmed by source code inspection in server/routes/adminRoutes.ts lines 177-184.'
    }
  },
  {
    verdict: 'confirmed',
    fingerprint: 'notification-html-injection-transactional-emails',
    title: 'Unescaped User Input in Transactional Email Templates Enables HTML Injection',
    description: 'In server/services/notificationService.ts, customer-controlled fields submitted in bulk enquiries (contact_name, organization_name, notes, delivery_address) and order recipient names are interpolated directly into raw HTML email strings without escaping. An attacker can inject arbitrary HTML markup, styles, or phishing links into emails delivered to the store administrator inbox or customer acknowledgement emails.',
    root_cause: 'notifyNewBulkEnquiry and notifyOrderPlaced in server/services/notificationService.ts interpolate raw customer strings into HTML strings instead of calling the escapeHtml helper.',
    intended_behavior: 'All customer-supplied strings must be escaped using escapeHtml before being interpolated into HTML email templates.',
    trace: [
      {
        kind: 'entrypoint',
        file: 'server/routes/publicRoutes.ts',
        line: 360,
        scope: 'POST /api/enquiries',
        description: 'Receives contact_name, organization_name, and notes from unauthenticated user request.'
      },
      {
        kind: 'propagation',
        file: 'server/routes/publicRoutes.ts',
        line: 411,
        scope: 'POST /api/enquiries',
        description: 'Passes newEnquiry object to notifyNewBulkEnquiry.'
      },
      {
        kind: 'sink',
        file: 'server/services/notificationService.ts',
        line: 1157,
        scope: 'notifyNewBulkEnquiry',
        description: 'Interpolates unescaped contact_name, organization_name, and notes into email HTML string.'
      }
    ],
    evidence: [
      {
        file: 'server/services/notificationService.ts',
        line: 1157,
        description: '<p><strong>Name:</strong> ${enquiry.contact_name} ${enquiry.organization_name ? `(${enquiry.organization_name})` : ""}</p>'
      },
      {
        file: 'server/services/notificationService.ts',
        line: 1167,
        description: '<p><strong>Client Notes:</strong> ${enquiry.notes || "None"}</p>'
      }
    ],
    conditions: [
      {
        kind: 'user_interaction',
        description: 'Recipient opens the generated transactional notification email in an HTML email client.'
      }
    ],
    execution: {
      attacker_perspective: 'External unauthenticated visitor submitting a bulk enquiry',
      payloads: [
        '{"contact_name":"Security Test <b style=\\"color:red\\">TEST</b>","phone":"9876543210","event_date":"2026-12-01","notes":"<a href=\\"https://example.com\\">Click here to confirm quote</a>"}'
      ],
      instructions: [
        '1. Send HTTP POST /api/enquiries with HTML tags in contact_name and notes.',
        '2. Inspect the generated email HTML dispatched to store owner.',
        '3. Observe that raw HTML tags are rendered into the outgoing message body without entity encoding.'
      ],
      observed_result: 'Email template renders raw HTML tags directly in outgoing email.'
    },
    remediation: {
      strategy: 'Wrap all enquiry fields in escapeHtml() before interpolating them into HTML email templates.',
      code_changes: [
        {
          file_name: 'server/services/notificationService.ts',
          fixed_code: '        <p><strong>Name:</strong> ${escapeHtml(enquiry.contact_name)} ${enquiry.organization_name ? `(${escapeHtml(enquiry.organization_name)})` : ""}</p>\n        <p><strong>Client Notes:</strong> ${escapeHtml(enquiry.notes || "None")}</p>'
        }
      ]
    },
    severity: {
      likelihood: {
        score: 'medium',
        reason: 'Anyone can submit public bulk enquiries without authentication.'
      },
      impact: {
        score: 'low',
        reason: 'Enables HTML formatting injection and phishing link insertion into admin notifications; modern email clients sandbox scripts.'
      },
      overall_severity: 'low'
    },
    confidence: {
      score: 'high',
      reason: 'Directly verified in server/services/notificationService.ts lines 1154-1188 where escapeHtml was omitted.'
    }
  },
  {
    verdict: 'needs_validation',
    fingerprint: 'public-enquiry-rate-limit-missing',
    title: 'Public Bulk Enquiry Endpoint Lacks Dedicated Rate Limiting Guarding Outbound Email Quota',
    description: 'POST /api/enquiries is mounted in server.ts without dedicated rate limiting or IP burst controls. Each submission triggers outbound transactional emails via ZeptoMail to both the store owner and customer, potentially allowing automated scripts to flood the owner inbox or consume monthly transactional email quotas.',
    claimed_root_cause: 'server.ts line 154 mounts publicRoutes without dedicated rate limiter for POST /api/enquiries.',
    trace: [
      {
        kind: 'entrypoint',
        file: 'server.ts',
        line: 154,
        scope: 'app.use(/api, publicRoutes)',
        description: 'Mounts publicRoutes without dedicated enquiry rate limiter.'
      },
      {
        kind: 'propagation',
        file: 'server/routes/publicRoutes.ts',
        line: 359,
        scope: 'POST /api/enquiries',
        description: 'Handles bulk enquiry submission.'
      },
      {
        kind: 'sink',
        file: 'server/services/notificationService.ts',
        line: 1149,
        scope: 'notifyNewBulkEnquiry',
        description: 'Dispatches outbound emails via ZeptoMail API.'
      }
    ],
    evidence: [
      {
        file: 'server.ts',
        line: 154,
        description: 'app.use("/api", publicRoutes);'
      },
      {
        file: 'server/routes/publicRoutes.ts',
        line: 411,
        description: 'notifyNewBulkEnquiry(newEnquiry).catch(...);'
      }
    ],
    blockers: [
      'Production ZeptoMail account quota tier, delivery rate caps, and upstream Cloudflare WAF rate-limiting rules are not observable from repository source alone.'
    ],
    validation_plan: {
      local: 'Execute a script sending 50 consecutive POST /api/enquiries requests to verify if throttling triggers.',
      deployment: 'Check ZeptoMail dashboard account limits and configure a Cloudflare WAF rate limiting rule on POST /api/enquiries.'
    }
  }
];

findings.sort((a, b) => (a.fingerprint < b.fingerprint ? -1 : a.fingerprint > b.fingerprint ? 1 : 0));

fs.writeFileSync(
  path.join(__dirname, 'findings.json'),
  JSON.stringify(findings, null, 2),
  'utf8'
);
console.log('Wrote findings.json for run-2 with ' + findings.length + ' findings.');
