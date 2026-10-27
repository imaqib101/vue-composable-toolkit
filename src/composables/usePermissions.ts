import { computed, ref, type ComputedRef, type Ref } from 'vue';

export type Permission = string;
export type Role = string;

export interface PermissionsOptions {
  roles?: Role[];
  permissions?: Permission[];
  roleMap?: Record<Role, Permission[]>;
}

export function usePermissions(options: PermissionsOptions = {}) {
  const roleMap: Record<Role, Permission[]> = options.roleMap ?? {};

  const activeRoles: Ref<Role[]> = ref([...(options.roles ?? [])]);
  const explicitPermissions: Ref<Permission[]> = ref([...(options.permissions ?? [])]);

  const activePermissions: ComputedRef<Permission[]> = computed(() => {
    const derived: Permission[] = activeRoles.value.flatMap(
      (role) => roleMap[role] ?? []
    );
    return Array.from(new Set([...explicitPermissions.value, ...derived]));
  });

  function hasPermission(perm: Permission): ComputedRef<boolean> {
    return computed(() => activePermissions.value.includes(perm));
  }

  function hasRole(role: Role): ComputedRef<boolean> {
    return computed(() => activeRoles.value.includes(role));
  }

  function hasAnyPermission(...perms: Permission[]): ComputedRef<boolean> {
    return computed(() =>
      perms.some((p) => activePermissions.value.includes(p))
    );
  }

  function hasAllPermissions(...perms: Permission[]): ComputedRef<boolean> {
    return computed(() =>
      perms.every((p) => activePermissions.value.includes(p))
    );
  }

  function grantRole(role: Role): void {
    if (!activeRoles.value.includes(role)) {
      activeRoles.value = [...activeRoles.value, role];
    }
  }

  function revokeRole(role: Role): void {
    activeRoles.value = activeRoles.value.filter((r) => r !== role);
  }

  function grantPermission(perm: Permission): void {
    if (!explicitPermissions.value.includes(perm)) {
      explicitPermissions.value = [...explicitPermissions.value, perm];
    }
  }

  function revokePermission(perm: Permission): void {
    explicitPermissions.value = explicitPermissions.value.filter((p) => p !== perm);
  }

  return {
    activeRoles,
    activePermissions,
    hasPermission,
    hasRole,
    hasAnyPermission,
    hasAllPermissions,
    grantRole,
    revokeRole,
    grantPermission,
    revokePermission,
  };
}