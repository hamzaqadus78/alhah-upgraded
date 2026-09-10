// Render's dashboard has repeatedly ended up with stray whitespace/newlines
// pasted into FRONTEND_BASE's value (e.g. "https://x.com\n\n"), which
// silently breaks every emailed link built from it. Trimming here makes
// link-building immune to that regardless of what ends up in the dashboard.
function getFrontendBase() {
  return (process.env.FRONTEND_BASE || '').trim().replace(/\/+$/, '');
}

module.exports = { getFrontendBase };
