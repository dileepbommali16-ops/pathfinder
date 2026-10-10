/**
 * Pathfinder 2.0 — Enterprise Node.js / Express Backend Microservice
 * Pure JavaScript runtime supporting Node.js 18+ without TypeScript compilation.
 */
const http = require('http');

const PORT = process.env.NODE_PORT || 8080;

const COHORT_MOCK = [
  { id: 2024001, branch: 'CSE', cgpa: 8.92, status: 'Placed', ctc: 14.5 },
  { id: 2024002, branch: 'ECE', cgpa: 8.15, status: 'Placed', ctc: 9.2 },
  { id: 2024003, branch: 'IT', cgpa: 7.80, status: 'Placed', ctc: 7.5 },
  { id: 2024004, branch: 'MECH', cgpa: 7.20, status: 'Placed', ctc: 6.0 }
];

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-key',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-key'
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Health endpoint
  if (url.pathname === '/api/health') {
    return sendJson(res, 200, {
      status: 'healthy',
      service: 'Pathfinder 2.0 Node.js Microservice',
      runtime: `Node.js ${process.version}`,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  }

  // Analytics cohort endpoint
  if (url.pathname === '/api/analytics' && req.method === 'GET') {
    return sendJson(res, 200, {
      success: true,
      total_cohort_count: 972,
      records: COHORT_MOCK,
      message: 'Node.js Analytics Engine Active'
    });
  }

  // Placement prediction endpoint
  if (url.pathname === '/api/predict' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const cgpa = Number(payload.cgpa) || 7.0;
        const internships = Number(payload.internships) || 0;
        const backlogs = Number(payload.backlogs) || 0;

        // Machine Learning probability heuristic
        const rawScore = (cgpa * 9.2) + (internships * 5.5) - (backlogs * 12.0);
        const probability = Math.min(0.98, Math.max(0.20, rawScore / 100));

        let tier = 'Tier 3 - Core / IT Services';
        let salaryBand = '₹4.5 - ₹7.0 LPA';

        if (probability >= 0.85) {
          tier = 'Tier 1 - Product & Tech Giants';
          salaryBand = '₹12.0 - ₹24.0 LPA';
        } else if (probability >= 0.65) {
          tier = 'Tier 2 - Premium Product / High Growth';
          salaryBand = '₹7.5 - ₹12.0 LPA';
        }

        return sendJson(res, 200, {
          success: true,
          probability: parseFloat(probability.toFixed(4)),
          tier: tier,
          salary_band: salaryBand,
          engine: 'Pathfinder Node.js Core Predictor'
        });
      } catch {
        return sendJson(res, 400, { error: 'Invalid JSON payload' });
      }
    });
    return;
  }

  // Fallback 404
  sendJson(res, 404, { error: 'Route not found on Node.js microservice' });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`[Pathfinder] Node.js backend server listening on port ${PORT}`);
  });
}

module.exports = server;
