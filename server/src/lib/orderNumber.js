// Order.orderSeq is a Postgres-backed autoincrement column (atomic, no race
// conditions even with concurrent checkouts) — this just formats it for
// display everywhere an order is shown to a human (confirmation page,
// admin dashboard, order-status emails).
function formatOrderNumber(seq) {
  return `ORD-${String(seq).padStart(5, '0')}`;
}

module.exports = { formatOrderNumber };
