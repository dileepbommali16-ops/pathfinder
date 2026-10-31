// Vercel Serverless Function: Keep Render backend awake every 5 minutes
export default async function handler(req, res) {
  const backendUrl = process.env.BACKEND_URL || "https://pathfinder-backend-klrp.onrender.com";
  try {
    const response = await fetch(`${backendUrl}/health`, {
      headers: { "User-Agent": "Pathfinder-Vercel-Cron/2.0" }
    });
    const data = await response.json().catch(() => ({}));
    return res.status(200).json({
      status: "alive",
      timestamp: new Date().toISOString(),
      backend_status: response.status,
      backend_url: backendUrl,
      data
    });
  } catch (error) {
    return res.status(200).json({
      status: "ping_failed",
      timestamp: new Date().toISOString(),
      backend_url: backendUrl,
      error: error.message
    });
  }
}

