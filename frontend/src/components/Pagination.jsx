import React from 'react';
import { Button, Stack, Typography } from '@mui/material';
import { ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from '@mui/icons-material';

/**
 * Pagination Component
 * @param {Object} props
 * @param {number} props.currentPage - Current page (1-indexed)
 * @param {number} props.totalPages - Total number of pages
 * @param {function} props.onPageChange - Callback when page changes
 */
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems="center"
      justifyContent="center"
      spacing={{ xs: 1.2, sm: 2 }}
      sx={{
        mt: 2,
        mb: 1,
        py: 1,
        px: { xs: 1, sm: 1.5 },
        borderRadius: 999,
        border: '1px solid',
        borderColor: 'rgba(71,85,105,0.5)',
        backgroundColor: 'rgba(30,41,59,0.9)',
        alignSelf: 'center'
      }}
    >
      <Button
        size="small"
        startIcon={<ChevronLeftIcon />}
        onClick={handlePrevious}
        disabled={currentPage === 1}
        variant="outlined"
      >
        Previous
      </Button>

      <Typography variant="body2" sx={{ minWidth: { xs: 'auto', sm: '104px' }, textAlign: 'center', fontWeight: 600, color: '#e2e8f0' }}>
        Page {currentPage} of {totalPages}
      </Typography>

      <Button
        size="small"
        endIcon={<ChevronRightIcon />}
        onClick={handleNext}
        disabled={currentPage === totalPages}
        variant="outlined"
      >
        Next
      </Button>
    </Stack>
  );
};

export default Pagination;
