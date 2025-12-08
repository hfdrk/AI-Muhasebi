"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSIONS = void 0;
exports.hasPermission = hasPermission;
exports.hasAnyPermission = hasAnyPermission;
exports.hasAllPermissions = hasAllPermissions;
exports.ROLE_PERMISSIONS = {
    TenantOwner: [
        "documents:create",
        "documents:read",
        "documents:update",
        "documents:delete",
        "documents:analyze",
        "invoices:create",
        "invoices:read",
        "invoices:update",
        "invoices:delete",
        "invoices:export",
        "clients:create",
        "clients:read",
        "clients:update",
        "clients:delete",
        "risk:view",
        "risk:configure",
        "risk:acknowledge",
        "reports:view",
        "reports:create",
        "reports:export",
        "users:invite",
        "users:read",
        "users:update",
        "users:delete",
        "settings:read",
        "settings:update",
        "settings:billing",
        "integrations:read",
        "integrations:manage",
    ],
    Accountant: [
        "documents:create",
        "documents:read",
        "documents:update",
        "documents:delete",
        "documents:analyze",
        "invoices:create",
        "invoices:read",
        "invoices:update",
        "invoices:delete",
        "invoices:export",
        "clients:create",
        "clients:read",
        "clients:update",
        "clients:delete",
        "risk:view",
        "risk:configure",
        "risk:acknowledge",
        "reports:view",
        "reports:create",
        "reports:export",
        "users:invite",
        "users:read",
        "integrations:read",
        "integrations:manage",
    ],
    Staff: [
        "documents:create",
        "documents:read",
        "invoices:create",
        "invoices:read",
        "clients:read",
        "users:read",
        "reports:view",
    ],
    ReadOnly: [
        "documents:read",
        "invoices:read",
        "clients:read",
        "risk:view",
        "reports:view",
        "users:read",
        "integrations:read",
    ],
};
function hasPermission(role, permission) {
    if (!role || !exports.ROLE_PERMISSIONS[role]) {
        return false;
    }
    return exports.ROLE_PERMISSIONS[role].includes(permission);
}
function hasAnyPermission(role, permissions) {
    if (!role || !permissions || permissions.length === 0) {
        return false;
    }
    return permissions.some((permission) => hasPermission(role, permission));
}
function hasAllPermissions(role, permissions) {
    if (!role || !permissions || permissions.length === 0) {
        return false;
    }
    return permissions.every((permission) => hasPermission(role, permission));
}
//# sourceMappingURL=permissions.js.map