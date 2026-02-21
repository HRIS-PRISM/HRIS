import API_BASE_URL from '../../apiConfig';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Chip,
  Modal,
  IconButton,
  Card,
  CardContent,
  Avatar,
  Divider,
  Alert,
  InputAdornment,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Close,
  EventNote,
  Search as SearchIcon,
  AccessTime as TimeIcon,
} from "@mui/icons-material";

import LoadingOverlay from '../LoadingOverlay';
import SuccessfulOverlay from '../SuccessfulOverlay';

// Styled components
const GlassCard = ({ children, sx = {} }) => (
  <Card
    sx={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
      backdropFilter: 'blur(10px)',
      borderRadius: 3,
      border: '1px solid rgba(109, 35, 35, 0.1)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      transition: 'all 0.3s ease',
      '&:hover': {
        boxShadow: '0 12px 40px rgba(109, 35, 35, 0.12)',
      },
      ...sx,
    }}
  >
    {children}
  </Card>
);

const GradientHeader = ({ icon: Icon, title, subtitle, gradient = 'linear-gradient(135deg, #6D2323 0%, #8B4545 100%)' }) => (
  <Box
    sx={{
      background: gradient,
      color: '#fff',
      p: 2.5,
      borderRadius: '12px 12px 0 0',
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: -30,
        right: -30,
        width: 100,
        height: 100,
        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
        borderRadius: '50%',
      },
    }}
  >
    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 50, height: 50 }}>
      <Icon sx={{ fontSize: 28 }} />
    </Avatar>
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.3 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.9 }}>
        {subtitle}
      </Typography>
    </Box>
  </Box>
);

const LeaveTable = () => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [newLeaveType, setNewLeaveType] = useState({
    leave_description: '',
    leave_code: '',
    leave_hours: ''
  });
  const [editLeaveType, setEditLeaveType] = useState(null);
  const [originalLeaveType, setOriginalLeaveType] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successAction, setSuccessAction] = useState("");

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const fetchLeaveTypes = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/leaveRoute/leave_table`);
      setLeaveTypes(res.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleAdd = async () => {
    if (!newLeaveType.leave_code || !newLeaveType.leave_description) {
      return;
    }
    
    setLoading(true);
    try {
      const filteredLeaveType = Object.fromEntries(
        Object.entries(newLeaveType).filter(([_, value]) => value !== '')
      );
      
      await axios.post(`${API_BASE_URL}/leaveRoute/leave_table`, filteredLeaveType);
      setNewLeaveType({
        leave_description: '',
        leave_code: '',
        leave_hours: ''
      });
      setTimeout(() => {
        setLoading(false);
        setSuccessAction("adding");
        setSuccessOpen(true);
        setTimeout(() => setSuccessOpen(false), 2000);
      }, 300);
      fetchLeaveTypes();
    } catch (error) {
      console.error('Error adding data:', error);
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      await axios.put(`${API_BASE_URL}/leaveRoute/leave_table/${editLeaveType.id}`, editLeaveType);
      setEditLeaveType(null);
      setOriginalLeaveType(null);
      setIsEditing(false);
      fetchLeaveTypes();
      setSuccessAction("edit");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch (error) {
      console.error('Error updating data:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this leave type?')) {
      return;
    }
    
    try {
      await axios.delete(`${API_BASE_URL}/leaveRoute/leave_table/${id}`);
      setEditLeaveType(null);
      setOriginalLeaveType(null);
      setIsEditing(false);
      fetchLeaveTypes();
      setSuccessAction("delete");
      setSuccessOpen(true);
      setTimeout(() => setSuccessOpen(false), 2000);
    } catch (error) {
      console.error('Error deleting data:', error);
    }
  };

  const handleOpenModal = (leaveType) => {
    setEditLeaveType({ ...leaveType });
    setOriginalLeaveType({ ...leaveType });
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditLeaveType({ ...originalLeaveType });
    setIsEditing(false);
  };

  const handleCloseModal = () => {
    setEditLeaveType(null);
    setOriginalLeaveType(null);
    setIsEditing(false);
  };

  const fieldLabels = {
    leave_description: 'Leave Description',
    leave_code: 'Leave Code',
    leave_hours: 'Leave Hours'
  };

  const filteredLeaveTypes = leaveTypes.filter((leaveType) => {
    const description = leaveType.leave_description?.toLowerCase() || "";
    const code = leaveType.leave_code?.toLowerCase() || "";
    const search = searchTerm.toLowerCase();
    return description.includes(search) || code.includes(search);
  });

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      {/* Loading Overlay */}
      <LoadingOverlay open={loading} message="Processing leave type..." />
      
      {/* Success Overlay */}
      <SuccessfulOverlay open={successOpen} action={successAction} onClose={() => setSuccessOpen(false)} />

      {/* Add Leave Type Section */}
      <GlassCard sx={{ mb: 4 }}>
        <GradientHeader 
          icon={EventNote} 
          title="Leave Types Management" 
          subtitle="Define universal leave types and their default hours"
        />
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>
                Leave Code *
              </Typography>
              <TextField
                value={newLeaveType.leave_code}
                onChange={(e) => setNewLeaveType({ ...newLeaveType, leave_code: e.target.value.toUpperCase() })}
                fullWidth
                placeholder="e.g., VL, SL, EL"
                size="medium"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '& fieldset': { borderColor: 'rgba(109, 35, 35, 0.2)' },
                    '&:hover fieldset': { borderColor: '#6d2323' },
                    '&.Mui-focused fieldset': { borderColor: '#6d2323', borderWidth: 2 },
                  },
                }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>
                Leave Description *
              </Typography>
              <TextField
                value={newLeaveType.leave_description}
                onChange={(e) => setNewLeaveType({ ...newLeaveType, leave_description: e.target.value })}
                fullWidth
                placeholder="e.g., Vacation Leave"
                size="medium"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '& fieldset': { borderColor: 'rgba(109, 35, 35, 0.2)' },
                    '&:hover fieldset': { borderColor: '#6d2323' },
                    '&.Mui-focused fieldset': { borderColor: '#6d2323', borderWidth: 2 },
                  },
                }}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>
                Default Hours
              </Typography>
              <TextField
                type="number"
                value={newLeaveType.leave_hours}
                onChange={(e) => setNewLeaveType({ ...newLeaveType, leave_hours: e.target.value })}
                fullWidth
                placeholder="e.g., 80 (for 10 days)"
                size="medium"
                InputProps={{
                  endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                  startAdornment: (
                    <InputAdornment position="start">
                      <TimeIcon sx={{ color: '#6d2323', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '& fieldset': { borderColor: 'rgba(109, 35, 35, 0.2)' },
                    '&:hover fieldset': { borderColor: '#6d2323' },
                    '&.Mui-focused fieldset': { borderColor: '#6d2323', borderWidth: 2 },
                  },
                }}
              />
            </Grid>
          </Grid>

          <Button
            onClick={handleAdd}
            variant="contained"
            startIcon={<AddIcon />}
            disabled={loading || !newLeaveType.leave_code || !newLeaveType.leave_description}
            sx={{
              mt: 3,
              px: 4,
              py: 1.2,
              borderRadius: 2,
              backgroundColor: '#6D2323',
              color: '#FEF9E1',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(109, 35, 35, 0.3)',
              '&:hover': { 
                backgroundColor: '#5a1d1d',
                boxShadow: '0 6px 16px rgba(109, 35, 35, 0.4)',
              },
              '&:disabled': { 
                backgroundColor: '#ccc',
                boxShadow: 'none'
              }
            }}
          >
            {loading ? 'Adding...' : 'Add Leave Type'}
          </Button>
        </CardContent>
      </GlassCard>

      {/* Records Section */}
      <GlassCard>
        <Box
          sx={{
            p: 2.5,
            borderRadius: '12px 12px 0 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid rgba(109, 35, 35, 0.1)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(109, 35, 35, 0.1)', width: 50, height: 50 }}>
              <TimeIcon sx={{ fontSize: 28, color: '#6d2323' }} />
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#6d2323' }}>
                Leave Types Records
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                {filteredLeaveTypes.length} leave types configured
              </Typography>
            </Box>
          </Box>

          <TextField
            size="small"
            variant="outlined"
            placeholder="Search leave types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              width: 280,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '& fieldset': { borderColor: 'rgba(109, 35, 35, 0.2)' },
                '&:hover fieldset': { borderColor: '#6d2323' },
                '&.Mui-focused fieldset': { borderColor: '#6d2323' },
              },
            }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: '#6d2323', mr: 1 }} />,
            }}
          />
        </Box>

        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={2}>
            {filteredLeaveTypes.map((leaveType) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={leaveType.id}>
                <Box
                  onClick={() => handleOpenModal(leaveType)}
                  sx={{
                    border: '1px solid rgba(109, 35, 35, 0.1)',
                    borderRadius: 3,
                    p: 2.5,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    background: 'linear-gradient(135deg, #fff 0%, #fafafa 100%)',
                    height: '100%',
                    minHeight: 140,
                    display: 'flex',
                    flexDirection: 'column',
                    '&:hover': { 
                      boxShadow: '0 8px 24px rgba(109, 35, 35, 0.15)',
                      borderColor: '#6d2323',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  {/* Header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#6d2323', width: 48, height: 48 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        {leaveType.leave_code?.substring(0, 2)}
                      </Typography>
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#6d2323' }}>
                        {leaveType.leave_code}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#888' }}>
                        Leave Code
                      </Typography>
                    </Box>
                  </Box>

                  {/* Description */}
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: '#333', 
                      mb: 2,
                      flexGrow: 1,
                      lineHeight: 1.4
                    }}
                  >
                    {leaveType.leave_description || 'No description'}
                  </Typography>

                  <Divider sx={{ my: 1.5 }} />

                  {/* Hours Info */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TimeIcon sx={{ fontSize: 18, color: '#6d2323' }} />
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#6d2323' }}>
                        {(leaveType.leave_hours || 0) / 8} days
                      </Typography>
                    </Box>
                    <Chip
                      label={`${leaveType.leave_hours || 0} hrs`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(109, 35, 35, 0.08)',
                        color: '#6d2323',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                      }}
                    />
                  </Box>
                </Box>
              </Grid>
            ))}

            {filteredLeaveTypes.length === 0 && (
              <Grid item xs={12}>
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <EventNote sx={{ fontSize: 60, color: 'rgba(109, 35, 35, 0.2)', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: '#6D2323', fontWeight: 600 }}>
                    {leaveTypes.length === 0 ? 'No leave types found' : 'No matching records'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#888' }}>
                    {leaveTypes.length === 0 ? 'Create your first leave type above!' : 'Try adjusting your search criteria'}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </GlassCard>

      {/* Modal */}
      <Modal
        open={!!editLeaveType}
        onClose={handleCloseModal}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            backgroundColor: '#fff',
            borderRadius: 4,
            width: '90%',
            maxWidth: '500px',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}
        >
          {editLeaveType && (
            <>
              {/* Modal Header */}
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #6D2323 0%, #8B4545 100%)',
                  color: '#ffffff',
                  p: 3,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
                    <EditIcon sx={{ fontSize: 24 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {isEditing ? 'Edit Leave Type' : 'Leave Type Details'}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      {editLeaveType.leave_code}
                    </Typography>
                  </Box>
                </Box>
                <IconButton onClick={handleCloseModal} sx={{ color: '#fff' }}>
                  <Close />
                </IconButton>
              </Box>

              {/* Modal Content */}
              <Box sx={{ p: 3 }}>
                <Grid container spacing={3}>
                  {Object.keys(newLeaveType).map((field) => (
                    <Grid item xs={12} key={field}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>
                        {fieldLabels[field]}
                      </Typography>
                      <TextField
                        value={editLeaveType[field] || ''}
                        onChange={(e) =>
                          setEditLeaveType({ ...editLeaveType, [field]: field === 'leave_code' ? e.target.value.toUpperCase() : e.target.value })
                        }
                        fullWidth
                        disabled={!isEditing}
                        type={field === 'leave_hours' ? 'number' : 'text'}
                        InputProps={field === 'leave_hours' ? {
                          endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                        } : undefined}
                        sx={{
                          '& .MuiOutlinedInput-root': { borderRadius: 2 },
                          '& .MuiInputBase-input.Mui-disabled': {
                            WebkitTextFillColor: '#000',
                          }
                        }}
                      />
                    </Grid>
                  ))}

                  {/* Days Summary */}
                  <Grid item xs={12}>
                    <Box 
                      sx={{ 
                        p: 2, 
                        borderRadius: 2, 
                        bgcolor: 'rgba(109, 35, 35, 0.05)',
                        border: '1px solid rgba(109, 35, 35, 0.1)'
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: '#6d2323' }}>
                        Days Equivalent (8 hours = 1 day)
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: '#6d2323' }}>
                        {((editLeaveType.leave_hours || 0) / 8).toFixed(1)} days
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4, gap: 2 }}>
                  {!isEditing ? (
                    <>
                      <Button
                        onClick={() => handleDelete(editLeaveType.id)}
                        variant="contained"
                        startIcon={<DeleteIcon />}
                        sx={{
                          bgcolor: '#333',
                          color: '#fff',
                          borderRadius: 2,
                          px: 3,
                          '&:hover': { bgcolor: '#111' }
                        }}
                      >
                        Delete
                      </Button>
                      <Button
                        onClick={handleStartEdit}
                        variant="contained"
                        startIcon={<EditIcon />}
                        sx={{ 
                          bgcolor: '#6D2323', 
                          color: '#FEF9E1',
                          borderRadius: 2,
                          px: 3,
                          '&:hover': { bgcolor: '#5a1d1d' }
                        }}
                      >
                        Edit
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={handleCancelEdit}
                        variant="outlined"
                        startIcon={<CancelIcon />}
                        sx={{
                          color: '#6d2323',
                          borderColor: '#6d2323',
                          borderRadius: 2,
                          px: 3,
                          '&:hover': { 
                            borderColor: '#6d2323',
                            bgcolor: 'rgba(109, 35, 35, 0.05)'
                          }
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleUpdate}
                        variant="contained"
                        startIcon={<SaveIcon />}
                        sx={{ 
                          bgcolor: '#6D2323', 
                          color: '#FEF9E1',
                          borderRadius: 2,
                          px: 3,
                          '&:hover': { bgcolor: '#5a1d1d' }
                        }}
                      >
                        Save Changes
                      </Button>
                    </>
                  )}
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Modal>
    </Container>
  );
};

export default LeaveTable;