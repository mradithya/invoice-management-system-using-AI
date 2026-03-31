import React, { useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Avatar,
  Box,
  Button,
  ClickAwayListener,
  Drawer,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import Groups2RoundedIcon from '@mui/icons-material/Groups2Rounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import PolicyRoundedIcon from '@mui/icons-material/PolicyRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import AiChatbot from './AiChatbot';
import SidebarNav from './dashboard/SidebarNav';

const Layout = () => {
  const { logout, isAdmin, user, updateProfile } = useAuth();
  const notify = useNotification();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftPhoto, setDraftPhoto] = useState(null);
  const [draftPhotoFile, setDraftPhotoFile] = useState(null);

  const resolvePhotoSrc = (photo) => {
    if (!photo || typeof photo !== 'string') return undefined;
    if (photo.startsWith('data:image/')) return photo;
    if (/^https?:\/\//i.test(photo)) return photo;
    if (photo.startsWith('/')) return `http://localhost${photo}`;
    return photo;
  };

  const navItems = useMemo(() => {
    const base = [
      { label: 'Dashboard', path: '/dashboard', icon: <DashboardRoundedIcon fontSize="small" /> },
      { label: 'Clients', path: '/clients', icon: <Groups2RoundedIcon fontSize="small" /> },
      { label: 'Invoices', path: '/invoices', icon: <ReceiptLongRoundedIcon fontSize="small" /> },
      { label: 'Recurring', path: '/recurring', icon: <AutorenewRoundedIcon fontSize="small" /> }
    ];

    if (isAdmin) {
      base.push({ label: 'Users', path: '/admin/users', icon: <ManageAccountsRoundedIcon fontSize="small" /> });
      base.push({ label: 'Audit', path: '/admin/audit', icon: <PolicyRoundedIcon fontSize="small" /> });
    }

    base.push({ label: 'Logout', icon: <LogoutRoundedIcon fontSize="small" />, onClick: logout });

    return base;
  }, [isAdmin, logout]);

  const initials = (user?.full_name || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const handleSidebarNavigate = () => setMobileOpen(false);

  const openProfile = () => {
    setDraftName(user?.full_name || '');
    setDraftPhoto(user?.profile_photo || null);
    setDraftPhotoFile(null);
    setProfileEditing(false);
    setProfileOpen(true);
  };

  const closeProfile = () => {
    if (profileSaving) return;
    setProfileOpen(false);
    setProfileEditing(false);
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      notify.error('Please select a PNG, JPG, WEBP, or GIF image');
      return;
    }

    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      notify.error('Photo must be under 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setDraftPhoto(typeof reader.result === 'string' ? reader.result : null);
      setDraftPhotoFile(file);
    };
    reader.onerror = () => notify.error('Failed to read image file');
    reader.readAsDataURL(file);
  };

  const handleCancelEdit = () => {
    setDraftName(user?.full_name || '');
    setDraftPhoto(user?.profile_photo || null);
    setDraftPhotoFile(null);
    setProfileEditing(false);
  };

  const handleSaveProfile = async () => {
    const fullName = draftName.trim();
    if (!fullName) {
      notify.error('Full name is required');
      return;
    }

    setProfileSaving(true);
    try {
      let payload;

      if (draftPhotoFile) {
        payload = new FormData();
        payload.append('full_name', fullName);
        payload.append('profile_photo', draftPhotoFile);
      } else {
        payload = {
          full_name: fullName,
          profile_photo: draftPhoto || null
        };
      }

      const response = await updateProfile(payload);

      if (response?.success) {
        notify.success('Profile updated successfully');
        setDraftPhotoFile(null);
        setProfileEditing(false);
      }
    } catch (error) {
      notify.error(error.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <Box
      sx={{
        height: '100dvh',
        p: { xs: 1, md: 2 },
        boxSizing: 'border-box',
        overflow: 'hidden',
        background:
          theme === 'dark'
            ? 'linear-gradient(135deg, #0f172a 0%, #111827 100%)'
            : 'linear-gradient(140deg, #e9e5ff 0%, #efeaff 20%, #eaf6ff 55%, #f7f7fb 100%)'
      }}
    >
      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: 288,
            background: 'transparent',
            border: 'none'
          }
        }}
      >
        <SidebarNav items={navItems} mobile onNavigate={handleSidebarNavigate} />
      </Drawer>

      <Box
        sx={{
          maxWidth: 1540,
          mx: 'auto',
          height: '100%',
          minHeight: 0,
          borderRadius: { xs: 3, md: 5 },
          border: '1px solid',
          borderColor: theme === 'dark' ? 'rgba(148,163,184,0.25)' : 'rgba(255,255,255,0.75)',
          backgroundColor: theme === 'dark' ? '#0b1220' : '#f5f6fa',
          boxShadow:
            theme === 'dark'
              ? '0 18px 40px rgba(2,6,23,0.45)'
              : '0 24px 60px rgba(76, 29, 149, 0.14)',
          display: 'flex',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ width: 288, display: { xs: 'none', md: 'block' } }}>
          <SidebarNav items={navItems} onNavigate={handleSidebarNavigate} />
        </Box>

        <Box
          sx={{
            flex: 1,
            p: { xs: 1.5, sm: 2, md: 2.5 },
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            minHeight: 0,
            overflow: 'hidden'
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              onClick={() => setMobileOpen(true)}
              sx={{ border: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper' }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Financial Analyzer
            </Typography>
          </Stack>

          <Box
            sx={{
              p: { xs: 1.2, md: 1.5 },
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontSize: { xs: '1rem', md: '1.2rem' },
                fontWeight: 700,
                display: { xs: 'none', sm: 'block' }
              }}
            >
              Welcome {user?.full_name?.split(' ')[0] || 'back'}!
            </Typography>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 'auto' }}>
              <TextField
                placeholder="Search your items"
                size="small"
                sx={{
                  display: { xs: 'none', sm: 'block' },
                  width: { sm: 220, md: 280 },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 999,
                    backgroundColor: theme === 'dark' ? 'rgba(148,163,184,0.14)' : '#f3f4f6'
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRoundedIcon sx={{ color: 'text.secondary', fontSize: 19 }} />
                    </InputAdornment>
                  )
                }}
              />

              <IconButton onClick={toggleTheme} sx={{ border: '1px solid', borderColor: 'divider' }}>
                {theme === 'dark' ? (
                  <LightModeRoundedIcon fontSize="small" />
                ) : (
                  <DarkModeRoundedIcon fontSize="small" />
                )}
              </IconButton>

              <ClickAwayListener onClickAway={closeProfile}>
                <Box sx={{ position: 'relative' }}>
                  <IconButton
                    onClick={() => (profileOpen ? closeProfile() : openProfile())}
                    aria-label="User profile"
                    sx={{ p: 0, border: '1px solid', borderColor: 'divider' }}
                  >
                    <Avatar
                      src={resolvePhotoSrc(user?.profile_photo)}
                      sx={{
                        width: 34,
                        height: 34,
                        fontSize: '0.85rem',
                        background: 'linear-gradient(135deg, #14b8a6 0%, #0ea5e9 100%)'
                      }}
                    >
                      {initials || 'U'}
                    </Avatar>
                  </IconButton>

                  {profileOpen ? (
                    <Box
                      sx={{
                        position: 'absolute',
                        right: 0,
                        top: 'calc(100% + 10px)',
                        width: 320,
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        backgroundColor: 'background.paper',
                        boxShadow: 10,
                        p: 2,
                        zIndex: 30
                      }}
                    >
                      <Stack spacing={1.75}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar
                            src={resolvePhotoSrc(profileEditing ? draftPhoto : user?.profile_photo)}
                            sx={{
                              width: 56,
                              height: 56,
                              background: 'linear-gradient(135deg, #14b8a6 0%, #0ea5e9 100%)'
                            }}
                          >
                            {initials || 'U'}
                          </Avatar>

                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 800 }} noWrap>
                              {user?.full_name || 'User'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {user?.email || '-'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                              {user?.role || 'staff'}
                            </Typography>
                          </Box>
                        </Stack>

                        {profileEditing ? (
                          <Stack spacing={1.25}>
                            <TextField
                              label="Full Name"
                              size="small"
                              value={draftName}
                              onChange={(event) => setDraftName(event.target.value)}
                              disabled={profileSaving}
                            />

                            <Button variant="outlined" size="small" component="label" disabled={profileSaving}>
                              Upload Photo
                              <input
                                hidden
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/gif"
                                onChange={handlePhotoChange}
                              />
                            </Button>

                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Button size="small" variant="text" onClick={handleCancelEdit} disabled={profileSaving}>
                                Cancel
                              </Button>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={handleSaveProfile}
                                disabled={profileSaving}
                              >
                                {profileSaving ? 'Saving...' : 'Save'}
                              </Button>
                            </Stack>
                          </Stack>
                        ) : (
                          <Button
                            variant="outlined"
                            size="small"
                            fullWidth
                            onClick={() => setProfileEditing(true)}
                          >
                            Edit Profile
                          </Button>
                        )}
                      </Stack>
                    </Box>
                  ) : null}
                </Box>
              </ClickAwayListener>
            </Stack>
          </Box>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
            style={{ flex: 1, width: '100%', minHeight: 0, overflow: 'auto' }}
          >
            <Box
              sx={{
                borderRadius: 3.2,
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: 'background.paper',
                p: { xs: 1.5, sm: 2.2, md: 2.6 },
                minHeight: '100%'
              }}
            >
              <Outlet />
            </Box>
          </motion.div>
        </Box>
      </Box>

      <AiChatbot />
    </Box>
  );
};

export default Layout;
