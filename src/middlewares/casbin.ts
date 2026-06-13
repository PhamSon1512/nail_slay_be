import type { Bindings, Variables } from '../@types';
import type { Policy } from '../utils/casbinPolicies';
import { createMiddleware } from 'hono/factory';
import { throwError } from '../utils';
import { getPolicies, ROLE_INHERITANCE } from '../utils/casbinPolicies';
import { Logger } from '../utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

type RoleAccess = {
  wildcard: boolean;
  exact: Set<string>; // "ACT::path"
  patterns: [string, string][]; // [act, path-pattern]
};

// ─── Singleton enforcer ───────────────────────────────────────────────────────
// Built once per Worker isolate from static policy list — zero DB queries.

let _accessMap: Map<string, RoleAccess> | null = null;

function buildAccessMap(): Map<string, RoleAccess> {
  const policies = getPolicies();

  // Build parent map: child → Set<parents>
  const parentMap = new Map<string, Set<string>>();
  for (const [child, parent] of ROLE_INHERITANCE) {
    const set = parentMap.get(child) ?? new Set<string>();
    set.add(parent);
    parentMap.set(child, set);
  }

  // BFS role expansion
  function expandRole(role: string): Set<string> {
    const all = new Set<string>([role]);
    const queue = [role];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const parent of parentMap.get(current) ?? []) {
        if (!all.has(parent)) {
          all.add(parent);
          queue.push(parent);
        }
      }
    }
    return all;
  }

  // Collect all known roles
  const allRoles = new Set<string>(policies.map((p) => p[0]));
  for (const [child, parent] of ROLE_INHERITANCE) {
    allRoles.add(child);
    allRoles.add(parent);
  }

  // Group direct policies by role
  const directPolicies = new Map<string, Policy[]>();
  for (const policy of policies) {
    const list = directPolicies.get(policy[0]) ?? [];
    list.push(policy);
    directPolicies.set(policy[0], list);
  }

  // Build RoleAccess per role (with inheritance)
  const accessMap = new Map<string, RoleAccess>();
  for (const role of allRoles) {
    const access: RoleAccess = { wildcard: false, exact: new Set(), patterns: [] };
    const inherited = expandRole(role);

    for (const r of inherited) {
      for (const [, obj, act] of directPolicies.get(r) ?? []) {
        if (obj === '*' && act === '*') {
          access.wildcard = true;
          break;
        }
        if (obj.includes(':')) {
          access.patterns.push([act, obj]);
        } else {
          access.exact.add(`${act}::${obj}`);
        }
      }
      if (access.wildcard) break;
    }

    accessMap.set(role, access);
  }

  return accessMap;
}

function getAccessMap(): Map<string, RoleAccess> {
  if (!_accessMap) {
    _accessMap = buildAccessMap();
    Logger.info('Casbin enforcer initialized', { policyCount: getPolicies().length });
  }
  return _accessMap;
}

// ─── Path matching ────────────────────────────────────────────────────────────

const _compiledPatterns = new Map<string, RegExp>();

function keyMatch2(request: string, pattern: string): boolean {
  if (pattern === request) return true;
  let re = _compiledPatterns.get(pattern);
  if (!re) {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    re = new RegExp(`^${escaped.replace(/:[^/]+/g, '[^/]+')}\\/?$`);
    _compiledPatterns.set(pattern, re);
  }
  return re.test(request);
}

// ─── Enforce ──────────────────────────────────────────────────────────────────

function enforce(role: string, obj: string, act: string): boolean {
  const access = getAccessMap().get(role);
  if (!access) return false;
  if (access.wildcard) return true;
  if (access.exact.has(`${act}::${obj}`)) return true;
  if (access.exact.has(`*::${obj}`)) return true;
  for (const [pAct, pObj] of access.patterns) {
    if (pAct !== '*' && pAct !== act) continue;
    if (keyMatch2(obj, pObj)) return true;
  }
  return false;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * RBAC authorization middleware using static Casbin-style policies.
 * Must run AFTER `auth` middleware (requires c.var.jwtPayload).
 *
 * - Enforcer is a singleton — built once per Worker isolate from static policies.
 * - Zero DB queries on hot path.
 * - Multi-role: allows if ANY assigned role passes.
 */
export const casbinMiddleware = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(async (c, next) => {
  const jwtPayload = c.var.jwtPayload;
  if (!jwtPayload) return throwError.unauthorized('Authentication required', { operation: 'casbin_check' });

  const roles: string[] = jwtPayload.roles ?? [];
  if (roles.length === 0) {
    return throwError.forbidden('No roles assigned to user', { userId: jwtPayload.id, operation: 'casbin_check' });
  }

  // Use absolute path from raw URL — c.req.path inside sub-routers is mount-relative.
  const rawPath = new URL(c.req.raw.url).pathname;
  const method = c.req.method.toUpperCase();

  const allowed = roles.some((role) => enforce(role, rawPath, method));

  if (!allowed) {
    Logger.warn('Casbin: permission denied', { userId: jwtPayload.id, resource: rawPath, action: method, roles });
    return throwError.forbidden('Insufficient permissions to access this resource', {
      userId: jwtPayload.id,
      resource: rawPath,
      action: method,
      roles,
      operation: 'casbin_authorization',
    });
  }

  await next();
});
