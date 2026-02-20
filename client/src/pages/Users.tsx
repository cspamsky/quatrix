import { useState, useMemo } from 'react';
import { apiFetch } from '../utils/api';
import { RefreshCw, Trash2, Key, Calendar, Lock, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../utils/date';
import SearchInput from '../components/ui/SearchInput';
import IconButton from '../components/ui/IconButton';
import Button from '../components/ui/Button';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface User {
  id: number;
  username: string;
  avatar_url: string | null;
  two_factor_enabled: number;
  permissions: string[];
  created_at: string;
}

const Users = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [tempPermissions, setTempPermissions] = useState<string[]>([]);
  const [user] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : { permissions: [] };
    } catch {
      return { permissions: [] };
    }
  });

  const availablePermissions = useMemo(
    () => [
      { id: 'servers.view', label: t('users.permissions_list.view_servers', 'View Instances') },
      { id: 'servers.create', label: t('users.permissions_list.create_servers', 'Create Servers') },
      { id: 'servers.delete', label: t('users.permissions_list.delete_servers', 'Delete Servers') },
      {
        id: 'servers.update',
        label: t('users.permissions_list.update_settings', 'Update Server Settings'),
      },
      {
        id: 'servers.console',
        label: t('users.permissions_list.access_console', 'Access Console'),
      },
      { id: 'servers.files', label: t('users.permissions_list.manage_files', 'Manage Files') },
      {
        id: 'servers.database',
        label: t('users.permissions_list.manage_databases', 'Manage Databases'),
      },
      { id: 'servers.maps', label: t('users.permissions_list.manage_maps', 'Manage Maps') },
      {
        id: 'servers.players',
        label: t('users.permissions_list.manage_players', 'Manage Players'),
      },
      { id: 'servers.admins', label: t('users.permissions_list.manage_admins', 'Manage Admins') },
      {
        id: 'servers.backups',
        label: t('users.permissions_list.manage_backups', 'Manage Backups'),
      },
      { id: 'plugins.manage', label: t('users.permissions_list.manage_plugins', 'Manage Plugins') },
      { id: 'analytics.view', label: t('users.permissions_list.view_analytics', 'View Analytics') },
      { id: 'users.manage', label: t('users.permissions_list.manage_users', 'Manage Users') },
    ],
    [t]
  );

  const canManage = user?.permissions?.includes('*') || user?.permissions?.includes('users.manage');

  // 1. Fetch Users
  const {
    data: users = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => apiFetch('/api/users').then((res) => res.json()),
  });

  const filteredUsers = useMemo(() => {
    return users.filter((user) => user.username.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [users, searchQuery]);

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(t('users.delete_confirm', { username }))) return;

    try {
      const response = await apiFetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success(t('users.delete_success', 'User deleted'));
        queryClient.invalidateQueries({ queryKey: ['users'] });
      } else {
        const data = await response.json();
        toast.error(data.message || t('users.delete_failed', 'Delete failed'));
      }
    } catch {
      toast.error(t('users.connection_error', 'Connection error'));
    }
  };

  const handleUpdatePermissions = async () => {
    if (!selectedUser) return;
    try {
      const response = await apiFetch(`/api/users/${selectedUser.id}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permissions: tempPermissions }),
      });

      if (response.ok) {
        toast.success(t('users.update_success', 'Permissions updated'));
        setIsPermissionModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['users'] });
      } else {
        const data = await response.json();
        toast.error(data.message || t('users.update_failed', 'Update failed'));
      }
    } catch {
      toast.error(t('users.connection_error', 'Connection error'));
    }
  };

  const togglePermission = (permId: string) => {
    setTempPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  return (
    <div className="p-6 font-display">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {t('users.title', 'User Management')}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {t('users.subtitle', 'List and manage system users and their permissions.')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SearchInput
            placeholder={t('users.search_placeholder', 'Search users...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            containerClassName="w-64"
          />

          <IconButton
            onClick={() => refetch()}
            isLoading={isLoading || isRefetching}
            title={t('common.refresh', 'Refresh')}
          >
            <RefreshCw className={cn('w-4 h-4', isRefetching && 'animate-spin text-primary')} />
          </IconButton>
        </div>
      </header>

      <div className="bg-[#111827] rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1d1d1d]/30 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                <th className="px-6 py-4 border-b border-gray-800/50">
                  {t('common.user', 'User')}
                </th>
                <th className="px-6 py-4 border-b border-gray-800/50 text-center">2FA</th>
                <th className="px-6 py-4 border-b border-gray-800/50">
                  {t('users.joined_at', 'Joined At')}
                </th>
                <th className="px-6 py-4 border-b border-gray-800/50 text-right">
                  {t('common.actions', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/30">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-sm">
                    {t('users.loading', 'Loading...')}
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 text-sm">
                    {t('users.no_users', 'No users found.')}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary shrink-0 overflow-hidden">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              className="w-full h-full object-cover"
                              alt=""
                            />
                          ) : (
                            user.username.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{user.username}</p>
                          <p className="text-[10px] text-gray-500 uppercase font-black">
                            ID: {user.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center">
                        {user.two_factor_enabled ? (
                          <div
                            className="p-1.5 bg-green-500/10 text-green-500 rounded-md border border-green-500/20"
                            title={t('users.two_fa_active', '2FA Active')}
                          >
                            <Key size={14} />
                          </div>
                        ) : (
                          <div
                            className="p-1.5 bg-gray-500/10 text-gray-500 rounded-md border border-gray-500/20"
                            title={t('users.two_fa_disabled', '2FA Disabled')}
                          >
                            <Key size={14} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Calendar size={12} />
                        {formatDate(user.created_at, t('common.date_formats.short'), i18n.language)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {canManage && (
                        <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                          <IconButton
                            onClick={() => {
                              setSelectedUser(user);
                              setTempPermissions(user.permissions || []);
                              setIsPermissionModalOpen(true);
                            }}
                            variant="ghost"
                            className="text-blue-400 hover:bg-blue-500/10"
                            title={t('users.edit_permissions', 'Edit Permissions')}
                          >
                            <Lock size={14} />
                          </IconButton>
                          <IconButton
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            variant="ghost"
                            className="text-red-400 hover:bg-red-500/10"
                            title={t('users.delete_user', 'Delete User')}
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions Modal */}
      {isPermissionModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-[#0B1120] rounded-2xl border border-gray-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <Lock size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">
                    {t('users.permissions.title', 'Permissions')}
                  </h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                    {t('users.permissions.managing', { username: selectedUser.username })}
                  </p>
                </div>
              </div>
              <IconButton
                onClick={() => setIsPermissionModalOpen(false)}
                variant="ghost"
                title="Close"
              >
                <X size={20} />
              </IconButton>
            </div>

            <div className="p-6 space-y-3 overflow-y-auto max-h-[60vh] custom-scrollbar">
              <div className="space-y-2">
                {availablePermissions.map((perm) => (
                  <label
                    key={perm.id}
                    className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl cursor-pointer hover:bg-white/[0.08] transition-all group"
                  >
                    <span className="text-xs font-semibold text-gray-300 group-hover:text-white transition-colors">
                      {perm.label}
                    </span>
                    <input
                      type="checkbox"
                      checked={tempPermissions.includes(perm.id)}
                      onChange={() => togglePermission(perm.id)}
                      className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-primary focus:ring-primary focus:ring-offset-0"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-800 bg-gray-900/40 flex gap-3">
              <Button
                onClick={() => setIsPermissionModalOpen(false)}
                variant="secondary"
                size="sm"
                fullWidth
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button onClick={handleUpdatePermissions} variant="primary" size="sm" fullWidth>
                {t('users.permissions.save', 'Save')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
