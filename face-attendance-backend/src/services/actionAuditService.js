import ActionAudit from "../models/pg/ActionAudit.js";
import User from "../models/pg/User.js";
import { emitToRoom } from "../socket.js";

const MANAGER_ROOM = "audit-managers";

/**
 * Record an audit action and emit a realtime event to the managers room.
 *
 * @param {import("express").Request} req
 * @param {Object} opts
 * @param {string} opts.action - e.g. "employee.deactivate", "leave.create"
 * @param {string} opts.category - one of ActionAudit.category enum
 * @param {number|null} [opts.targetUserId]
 * @param {string|null} [opts.entityType]
 * @param {number|null} [opts.entityId]
 * @param {string} [opts.summary]
 * @param {Object} [opts.metadata]
 * @param {import("sequelize").Transaction|null} [opts.transaction]
 * @returns {Promise<ActionAudit|null>}
 */
export async function recordAction(
  req,
  {
    action,
    category = "other",
    targetUserId = null,
    entityType = null,
    entityId = null,
    summary = null,
    metadata = {},
    transaction = null,
  }
) {
  try {
    const actorId = req?.user?.userId ?? req?.user?.id ?? null;
    const actorRole = String(req?.user?.role || "system").toLowerCase();

    const row = await ActionAudit.create(
      {
        actorId,
        actorRole,
        category,
        action,
        targetUserId,
        entityType,
        entityId,
        summary: summary ? String(summary).slice(0, 490) : null,
        metadata: metadata || {},
        ipAddress: req?.ip || null,
        userAgent: req?.get?.("user-agent") || null,
      },
      transaction ? { transaction } : {}
    );

    // Emit realtime (fire and forget, don't block on it)
    try {
      const payload = await buildAuditPayload(row);
      emitToRoom(MANAGER_ROOM, "audit:new", payload);
    } catch (emitErr) {
      console.warn("[actionAudit] socket emit failed:", emitErr.message);
    }

    return row;
  } catch (err) {
    // Never block a real operation on audit failures
    console.error("[actionAudit] recordAction error:", err.message);
    return null;
  }
}

/**
 * Build the JSON payload emitted over socket.io.
 * Enriches the raw row with actor + target names for immediate rendering.
 */
async function buildAuditPayload(row) {
  const plain = row.get ? row.get({ plain: true }) : row;
  const ids = [plain.actorId, plain.targetUserId].filter(Boolean);
  const users = ids.length
    ? await User.findAll({
        where: { id: ids },
        attributes: ["id", "name", "email", "employeeCode", "role"],
      })
    : [];
  const byId = new Map(users.map((u) => [u.id, u]));
  return {
    id: plain.id,
    actorId: plain.actorId,
    actorRole: plain.actorRole,
    category: plain.category,
    action: plain.action,
    targetUserId: plain.targetUserId,
    entityType: plain.entityType,
    entityId: plain.entityId,
    summary: plain.summary,
    metadata: plain.metadata || {},
    createdAt: plain.createdAt,
    Actor: plain.actorId ? toPlainUser(byId.get(plain.actorId)) : null,
    TargetUser: plain.targetUserId ? toPlainUser(byId.get(plain.targetUserId)) : null,
  };
}

function toPlainUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    employeeCode: u.employeeCode,
    role: u.role,
  };
}

/**
 * Build a concise default summary when the caller doesn't provide one.
 */
export function defaultSummary({ action, targetName, entityType, entityId }) {
  const verb = action.split(".").slice(1).join(" ") || action;
  const target = targetName ? ` — ${targetName}` : "";
  const entity =
    entityType && entityId ? ` (${entityType} #${entityId})` : "";
  return `${verb}${target}${entity}`.trim();
}

/**
 * Express middleware factory. Logs the action AFTER the route handler
 * responds with a 2xx status code.
 *
 * Usage:
 *   router.post("/leave/request",
 *     authMiddleware,
 *     auditMutation({
 *       action: "leave.create",
 *       category: "own_request",
 *       entityType: "leave_request",
 *       summary: (req, res) => `Submitted leave request`,
 *       entityIdFrom: (req, res, body) => body?.leaveRequest?.id ?? body?.request?.id ?? body?.id ?? null,
 *       metadata: (req, res, body) => ({ payload: req.body }),
 *     }),
 *     createLeaveRequest
 *   );
 *
 * @param {Object} cfg
 * @returns {import("express").RequestHandler}
 */
export function auditMutation(cfg) {
  const {
    action,
    category = "other",
    entityType = null,
    targetUserIdFrom = (req) => req?.user?.userId ?? req?.user?.id ?? null,
    entityIdFrom = null,
    summary = null,
    metadata = null,
  } = cfg || {};

  if (!action) {
    throw new Error("auditMutation requires an `action` name");
  }

  return function auditMutationMiddleware(req, res, next) {
    const originalJson = res.json.bind(res);
    let captured = null;

    res.json = (body) => {
      captured = body;
      return originalJson(body);
    };

    res.on("finish", () => {
      try {
        if (res.statusCode < 200 || res.statusCode >= 300) return;

        const resolvedTargetUserId =
          typeof targetUserIdFrom === "function"
            ? targetUserIdFrom(req, res, captured)
            : targetUserIdFrom;
        const resolvedEntityId =
          typeof entityIdFrom === "function"
            ? entityIdFrom(req, res, captured)
            : entityIdFrom;
        const resolvedSummary =
          typeof summary === "function"
            ? summary(req, res, captured)
            : summary || defaultSummary({ action, entityType, entityId: resolvedEntityId });
        const resolvedMeta =
          typeof metadata === "function" ? metadata(req, res, captured) : metadata || {};

        recordAction(req, {
          action,
          category,
          targetUserId: resolvedTargetUserId ?? null,
          entityType,
          entityId: resolvedEntityId ?? null,
          summary: resolvedSummary,
          metadata: resolvedMeta,
        });
      } catch (err) {
        console.warn("[auditMutation] post-response hook error:", err.message);
      }
    });

    next();
  };
}

export const AUDIT_MANAGER_ROOM = MANAGER_ROOM;
