import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bg = type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-500' 
           : type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-500'
           : 'bg-blue-500/10 border-blue-500/50 text-blue-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl border backdrop-blur-md shadow-lg flex items-center gap-3 ${bg}`}
    >
      <span className="text-sm font-semibold">{message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100">&times;</button>
    </motion.div>
  );
}

export default function PersonalInfo({ session }) {
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [email, setEmail] = useState('');
  
  const [toast, setToast] = useState(null);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setFirstName(session.user.user_metadata?.first_name || '');
      setLastName(session.user.user_metadata?.last_name || '');
      setAvatarUrl(session.user.user_metadata?.custom_avatar_url || session.user.user_metadata?.avatar_url || '');
      setEmail(session.user.email || '');
    }
  }, [session]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`.trim(),
        }
      });
      if (error) throw error;

      // Sync with Django backend
      const { data: { session: activeSession } } = await supabase.auth.getSession();
      const response = await fetch((window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1') ? 'http://localhost:8000' : 'https://api.nexa-scan.click') + '/api/v1/user/profile/update/', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${activeSession.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to sync profile with backend database.');
      }

      showToast('Profile updated successfully.', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // Validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Invalid format. Please upload a JPEG, PNG, or WEBP.', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('File too large. Maximum size is 2MB.', 'error');
      return;
    }

    try {
      setLoading(true);
      // Clean up old avatar if it exists so we don't leak storage
      const oldUrl = session.user.user_metadata?.custom_avatar_url;
      if (oldUrl) {
        const urlParts = oldUrl.split('/avatars/');
        if (urlParts.length > 1) {
          const oldFilePath = urlParts[1];
          await supabase.storage.from('avatars').remove([oldFilePath]);
        }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase.auth.updateUser({
        data: { custom_avatar_url: publicUrl }
      });

      if (updateError) throw updateError;
      
      setAvatarUrl(publicUrl);
      showToast('Avatar updated successfully.', 'success');
    } catch (error) {
      showToast(`Upload failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    
    setIsDeleting(true);
    try {
      // First get the active session token
      const { data: { session } } = await supabase.auth.getSession();
      
      // Call our Django backend deletion endpoint
      const response = await fetch((window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1') ? 'http://localhost:8000' : 'https://api.nexa-scan.click') + '/api/v1/user/delete/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to delete account');
      }

      await supabase.auth.signOut();
      // Router will handle redirect via session change
    } catch (error) {
      showToast(error.message, 'error');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const initial = (firstName || email || '?').charAt(0).toUpperCase();

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 animate-fade-in pb-24">
      <AnimatePresence>
        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}
      </AnimatePresence>

      <div>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--c-text-primary)' }}>Personal Info</h2>
        <p className="text-sm mt-1" style={{ color: 'var(--c-text-secondary)' }}>
          Manage your personal details and avatar.
        </p>
      </div>

      <div className="glass-panel p-1.5 rounded-[2.5rem]">
        <div className="h-full rounded-[calc(2.5rem-0.375rem)] p-6 md:p-10 relative overflow-hidden space-y-8" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-8 border-b" style={{ borderColor: 'var(--c-border)' }}>
            <div className="relative group">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-24 h-24 rounded-full object-cover shadow-lg"
                  style={{ border: '2px solid var(--c-purple)' }}
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center font-bold text-4xl shadow-lg text-white"
                  style={{ background: 'linear-gradient(135deg, var(--c-purple) 0%, #00F2FE 100%)' }}
                >
                  {initial}
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <span className="text-white text-xs font-semibold">Change</span>
                <input
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={loading}
                />
              </label>
            </div>
            <div className="text-center sm:text-left space-y-1">
              <h3 className="font-semibold" style={{ color: 'var(--c-text-primary)' }}>Profile Image</h3>
              <p className="text-xs" style={{ color: 'var(--c-text-muted)' }}>
                JPEG, PNG, or WEBP. Max 2MB.
              </p>
            </div>
          </div>

          {/* Info Form */}
          <form onSubmit={handleUpdateProfile} className="space-y-6 relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: 'var(--c-text-secondary)' }}>First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl outline-none transition-colors text-sm focus:ring-1 focus:ring-[#00F2FE]"
                  style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--c-text-primary)', border: '1px solid var(--c-border)' }}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: 'var(--c-text-secondary)' }}>Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl outline-none transition-colors text-sm focus:ring-1 focus:ring-[#00F2FE]"
                  style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--c-text-primary)', border: '1px solid var(--c-border)' }}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: 'var(--c-text-secondary)' }}>Email Address</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-3 rounded-xl outline-none cursor-not-allowed opacity-50 text-sm"
                style={{ background: 'transparent', color: 'var(--c-text-muted)', border: '1px solid var(--c-border)' }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--c-text-muted)' }}>Your primary registration email is immutable for security.</p>
            </div>

            <div className="pt-4 flex justify-end">
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-3 rounded-xl text-sm font-bold text-[#0B0C10] disabled:opacity-50 relative overflow-hidden group"
                style={{ background: 'linear-gradient(135deg, #00F2FE 0%, #4facfe 100%)' }}
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10">{loading ? 'Saving...' : 'Save Changes'}</span>
              </motion.button>
            </div>
          </form>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass-panel p-1.5 rounded-[2rem] mt-8" style={{ background: 'linear-gradient(to bottom right, rgba(239,68,68,0.1), transparent)' }}>
        <div className="h-full rounded-[calc(2rem-0.375rem)] p-6 md:p-8 relative overflow-hidden" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
          <h3 className="text-lg font-bold text-red-500 mb-2">Danger Zone</h3>
          <p className="text-sm mb-6" style={{ color: 'var(--c-text-secondary)' }}>
            Permanently delete your NEXA account, clearing all scan history, user profile data, and configurations.
          </p>
          <motion.button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-3 rounded-xl text-sm font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors border border-red-500/30"
          >
            Delete Account
          </motion.button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel p-1.5 rounded-[2rem] max-w-md w-full relative"
            >
              <div className="rounded-[calc(2rem-0.375rem)] p-6 sm:p-8 relative overflow-hidden" style={{ background: 'var(--c-surface-inset)', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)' }}>
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
                    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--c-text-primary)' }}>Delete your account?</h3>
                  <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--c-text-secondary)' }}>
                    We hate to see you go, but your data is your own. Deleting your account is <strong className="text-red-400">permanent</strong> and cannot be undone. All of your scan history, vulnerability reports, and profile settings will be immediately wiped from our servers.
                  </p>

                  <div className="space-y-2 mb-8">
                    <label className="text-sm font-medium" style={{ color: 'var(--c-text-primary)' }}>
                      Type <span className="text-red-500 font-mono select-none">DELETE</span> to confirm
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="w-full px-4 py-3 rounded-xl outline-none font-mono tracking-widest text-red-500 transition-colors focus:ring-1 focus:ring-red-500/50"
                      style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(239,68,68,0.3)' }}
                    />
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        setShowDeleteModal(false);
                        setDeleteConfirmText('');
                      }}
                      disabled={isDeleting}
                      className="flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-colors border"
                      style={{ background: 'transparent', borderColor: 'var(--c-border)', color: 'var(--c-text-primary)' }}
                    >
                      Cancel
                    </button>
                    <motion.button
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete Account'}
                    </motion.button>
                  </div>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
