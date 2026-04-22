/**
 * Newest first: last update (approve/reject/submit), then id for stable order.
 */
export function sortApprovalsByRecency(list) {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
    const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
    if (tb !== ta) return tb - ta;
    return (Number(b.id) || 0) - (Number(a.id) || 0);
  });
}
