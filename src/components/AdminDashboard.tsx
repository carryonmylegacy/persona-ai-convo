import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { logAdminAction } from '../lib/adminAuth';
import { Shield, Users, Activity, AlertTriangle, Search, Ban, Trash2, KeyRound, CheckCircle, XCircle } from 'lucide-react';

interface UserAccount {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
  is_suspended: boolean;
}

interface AuditLogEntry {
  id: string;
  action: string;
  target_email: string;
  created_at: string;
  admin_email: string;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');
  const [stats, setStats] = useState({
    totalUsers: 0,
    suspendedUsers: 0,
    activeUsers: 0
  });

  useEffect(() => {
    loadUsers();
    loadAuditLog();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);

      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

      if (authError) throw authError;

      const { data: suspensions } = await supabase
        .from('user_suspensions')
        .select('user_id')
        .eq('is_active', true);

      const suspendedIds = new Set(suspensions?.map(s => s.user_id) || []);

      const userAccounts: UserAccount[] = (authUsers.users || []).map(user => ({
        id: user.id,
        email: user.email || 'No email',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at || '',
        is_suspended: suspendedIds.has(user.id)
      }));

      setUsers(userAccounts);
      setStats({
        totalUsers: userAccounts.length,
        suspendedUsers: userAccounts.filter(u => u.is_suspended).length,
        activeUsers: userAccounts.filter(u => !u.is_suspended).length
      });
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAuditLog() {
    try {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select(`
          id,
          action,
          created_at,
          target_user_id,
          admin_id
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const userMap = new Map((authUsers.users || []).map(u => [u.id, u.email || 'Unknown']));

      const logEntries: AuditLogEntry[] = (data || []).map(entry => ({
        id: entry.id,
        action: entry.action,
        target_email: userMap.get(entry.target_user_id) || 'Unknown',
        created_at: entry.created_at,
        admin_email: userMap.get(entry.admin_id) || 'Unknown'
      }));

      setAuditLog(logEntries);
    } catch (error) {
      console.error('Error loading audit log:', error);
    }
  }

  async function handleSuspendUser(userId: string, email: string) {
    if (!confirm(`Suspend account for ${email}?`)) return;

    const reason = prompt('Reason for suspension:');
    if (!reason) return;

    try {
      const { data: { user: admin } } = await supabase.auth.getUser();
      if (!admin) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_suspensions')
        .insert({
          user_id: userId,
          suspended_by: admin.id,
          reason
        });

      if (error) throw error;

      await logAdminAction('SUSPEND_USER', userId, { reason, email });
      alert('User suspended successfully');
      loadUsers();
      loadAuditLog();
    } catch (error) {
      console.error('Error suspending user:', error);
      alert('Failed to suspend user');
    }
  }

  async function handleUnsuspendUser(userId: string, email: string) {
    if (!confirm(`Unsuspend account for ${email}?`)) return;

    try {
      const { data: { user: admin } } = await supabase.auth.getUser();
      if (!admin) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_suspensions')
        .update({
          is_active: false,
          unsuspended_at: new Date().toISOString(),
          unsuspended_by: admin.id
        })
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;

      await logAdminAction('UNSUSPEND_USER', userId, { email });
      alert('User unsuspended successfully');
      loadUsers();
      loadAuditLog();
    } catch (error) {
      console.error('Error unsuspending user:', error);
      alert('Failed to unsuspend user');
    }
  }

  async function handleDeleteUser(userId: string, email: string) {
    if (!confirm(`PERMANENTLY DELETE account for ${email}? This cannot be undone!`)) return;
    if (!confirm('Are you absolutely sure? All user data will be deleted.')) return;

    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;

      await logAdminAction('DELETE_USER', userId, { email });
      alert('User deleted successfully');
      loadUsers();
      loadAuditLog();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  }

  async function handleResetPassword(userId: string, email: string) {
    if (!confirm(`Send password reset email to ${email}?`)) return;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;

      await logAdminAction('RESET_PASSWORD', userId, { email });
      alert('Password reset email sent');
      loadAuditLog();
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Failed to send password reset email');
    }
  }

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-slate-700" />
            <h1 className="text-3xl font-bold text-slate-900">Admin Portal</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Users</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.totalUsers}</p>
                </div>
                <Users className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Active Users</p>
                  <p className="text-2xl font-bold text-green-900">{stats.activeUsers}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Suspended</p>
                  <p className="text-2xl font-bold text-orange-900">{stats.suspendedUsers}</p>
                </div>
                <XCircle className="w-8 h-8 text-orange-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="border-b border-slate-200">
            <div className="flex gap-6 px-6">
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'users'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  User Management
                </div>
              </button>
              <button
                onClick={() => setActiveTab('audit')}
                className={`py-4 px-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'audit'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Audit Log
                </div>
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'users' ? (
              <>
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search users by email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                    />
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-12 text-slate-500">Loading users...</div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">No users found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">Email</th>
                          <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">Status</th>
                          <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">Created</th>
                          <th className="text-left py-3 px-4 font-semibold text-sm text-slate-700">Last Sign In</th>
                          <th className="text-right py-3 px-4 font-semibold text-sm text-slate-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map(user => (
                          <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4 text-sm text-slate-900">{user.email}</td>
                            <td className="py-3 px-4 text-sm">
                              {user.is_suspended ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                  <AlertTriangle className="w-3 h-3" />
                                  Suspended
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                  <CheckCircle className="w-3 h-3" />
                                  Active
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-600">
                              {new Date(user.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-sm text-slate-600">
                              {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleResetPassword(user.id, user.email)}
                                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                  title="Reset Password"
                                >
                                  <KeyRound className="w-4 h-4 text-slate-600" />
                                </button>

                                {user.is_suspended ? (
                                  <button
                                    onClick={() => handleUnsuspendUser(user.id, user.email)}
                                    className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                                    title="Unsuspend User"
                                  >
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleSuspendUser(user.id, user.email)}
                                    className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
                                    title="Suspend User"
                                  >
                                    <Ban className="w-4 h-4 text-orange-600" />
                                  </button>
                                )}

                                <button
                                  onClick={() => handleDeleteUser(user.id, user.email)}
                                  className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                {auditLog.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">No audit log entries</div>
                ) : (
                  auditLog.map(entry => (
                    <div key={entry.id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{entry.action.replace(/_/g, ' ')}</p>
                          <p className="text-sm text-slate-600 mt-1">
                            Target: {entry.target_email}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            By: {entry.admin_email}
                          </p>
                        </div>
                        <span className="text-sm text-slate-500">
                          {new Date(entry.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
