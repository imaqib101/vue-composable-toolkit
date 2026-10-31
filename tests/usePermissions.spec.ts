import { describe, it, expect } from 'vitest';
import { usePermissions } from '../src/composables/usePermissions';

describe('usePermissions', () => {
  it('hasPermission: returns true for explicit permissions, false otherwise', () => {
    const { hasPermission } = usePermissions({ permissions: ['read', 'write'] });
    expect(hasPermission('read').value).toBe(true);
    expect(hasPermission('delete').value).toBe(false);
  });

  it('hasRole: returns true for active roles, false otherwise', () => {
    const { hasRole } = usePermissions({ roles: ['admin'] });
    expect(hasRole('admin').value).toBe(true);
    expect(hasRole('guest').value).toBe(false);
  });

  it('grantRole: adds role and its roleMap-derived permissions reactively', () => {
    const { grantRole, hasRole, hasPermission, activePermissions } = usePermissions({
      roleMap: { editor: ['read', 'write', 'publish'] },
    });
    expect(hasRole('editor').value).toBe(false);
    grantRole('editor');
    expect(hasRole('editor').value).toBe(true);
    expect(hasPermission('publish').value).toBe(true);
    expect(activePermissions.value).toContain('write');
  });

  it('revokeRole: removes role and its derived permissions', () => {
    const { revokeRole, hasRole, hasPermission } = usePermissions({
      roles: ['admin'],
      roleMap: { admin: ['delete', 'ban'] },
    });
    expect(hasPermission('delete').value).toBe(true);
    revokeRole('admin');
    expect(hasRole('admin').value).toBe(false);
    expect(hasPermission('delete').value).toBe(false);
  });

  it('hasAnyPermission: true if at least one perm is active', () => {
    const { hasAnyPermission } = usePermissions({ permissions: ['read'] });
    expect(hasAnyPermission('read', 'write').value).toBe(true);
    expect(hasAnyPermission('delete', 'ban').value).toBe(false);
  });

  it('hasAllPermissions: true only when every listed perm is active', () => {
    const { hasAllPermissions } = usePermissions({ permissions: ['read', 'write'] });
    expect(hasAllPermissions('read', 'write').value).toBe(true);
    expect(hasAllPermissions('read', 'write', 'delete').value).toBe(false);
  });

  it('grantPermission / revokePermission: mutate explicit permissions reactively', () => {
    const { grantPermission, revokePermission, hasPermission } = usePermissions();
    expect(hasPermission('export').value).toBe(false);
    grantPermission('export');
    expect(hasPermission('export').value).toBe(true);
    revokePermission('export');
    expect(hasPermission('export').value).toBe(false);
  });

  it('activePermissions: deduplicates between explicit and role-derived perms', () => {
    const { activePermissions } = usePermissions({
      permissions: ['read'],
      roles: ['viewer'],
      roleMap: { viewer: ['read', 'list'] },
    });
    const perms = activePermissions.value;
    expect(perms.filter((p) => p === 'read')).toHaveLength(1);
    expect(perms).toContain('list');
  });
});