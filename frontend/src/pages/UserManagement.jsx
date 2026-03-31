import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Stack,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import { userService } from '../services/apiService';
import { useNotification } from '../context/NotificationContext';
import AnimatedPage from '../components/AnimatedPage';
import EmptyState from '../components/EmptyState';
import Pagination from '../components/Pagination';
import { GroupOutlined as GroupIcon } from '@mui/icons-material';

const UserManagement = () => {
  const notify = useNotification();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadUsers = async () => {
    try {
      const response = await userService.getAll();
      if (response.success) {
        setUsers(response.data);
        setCurrentPage(1);
      }
    } catch (error) {
      notify.error(error.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const changeRole = async (id, role) => {
    try {
      await userService.updateRole(id, role);
      notify.success('Role updated successfully');
      await loadUsers();
    } catch (error) {
      notify.error(error.message || 'Failed to update role');
    }
  };

  if (loading) {
    return (
      <AnimatedPage>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </AnimatedPage>
    );
  }

  // Calculate pagination
  const totalPages = Math.ceil(users.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const displayedUsers = users.slice(startIdx, endIdx);
  const formatJoinedDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
  };

  return (
    <AnimatedPage>
      <Stack spacing={2.5}>
        <Stack spacing={0.5}>
          <Typography variant="h4" fontWeight={700} letterSpacing="-0.4px">
            User Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage user roles and access permissions.
          </Typography>
        </Stack>

        {users.length === 0 ? (
          <EmptyState
            icon={GroupIcon}
            title="No users found"
            message="There are no users in the system yet."
          />
        ) : (
          <>
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 640 }}>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'rgba(15,118,110,0.08)' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Joined</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {displayedUsers.map((user, index) => (
                      <TableRow
                        key={user.id}
                        component={motion.tr}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.05 * index }}
                        hover
                        sx={{
                          '&:hover': { backgroundColor: 'rgba(15,118,110,0.04)' }
                        }}
                      >
                        <TableCell sx={{ fontWeight: 600 }}>{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onChange={(e) => changeRole(user.id, e.target.value)}
                            size="small"
                            sx={{ minWidth: { xs: 100, sm: 120 }, width: { xs: '100%', sm: 'auto' } }}
                          >
                            <MenuItem value="admin">Admin</MenuItem>
                            <MenuItem value="staff">Staff</MenuItem>
                          </Select>
                        </TableCell>
                        <TableCell>{formatJoinedDate(user.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
            
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </Stack>
    </AnimatedPage>
  );
};

export default UserManagement;
