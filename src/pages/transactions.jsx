import { useState, useEffect } from 'react';
import Layout from '../components/layout/layout.jsx';
import { useAuth } from '../context/auth/AuthContext';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Card,
  CardContent,
  Grid,
  IconButton,
  Typography,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

const API_URL = import.meta.env.VITE_API_URL;

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    amount: '',
    type: 'expense',
    category_id: '',
    date: formatDate(new Date()),
    is_recurring: false,
    recurrence_pattern: 'monthly',
    recurrence_end_date: null,
  });

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/transactions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch transactions');
      
      const data = await response.json();
      setTransactions(data);
      setError(null);
    } catch (err) {
      setError('Failed to load transactions');
      console.error('Error:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/categories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch categories');
      
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      setError('Failed to load categories');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      Promise.all([fetchTransactions(), fetchCategories()]);
    }
  }, [user]);

  const handleOpen = () => setOpen(true);
  
  const handleClose = () => {
    setOpen(false);
    setEditingTransaction(null);
    setFormData({
      name: '',
      description: '',
      amount: '',
      type: 'expense',
      category_id: '',
      date: formatDate(new Date()),
      is_recurring: false,
      recurrence_pattern: 'monthly',
      recurrence_end_date: null,
    });
    setError(null);
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      ...transaction,
      date: formatDate(new Date(transaction.date)),
      recurrence_end_date: transaction.recurrence_end_date 
        ? formatDate(new Date(transaction.recurrence_end_date))
        : null,
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/transactions?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete transaction');

      setTransactions(transactions.filter(t => t.id !== id));
    } catch (err) {
      setError('Failed to delete transaction');
      console.error('Error:', err);
    }
  };

  const handleSubmit = async () => {
    try {
      const url = `${API_URL}/api/transactions`;
      const method = editingTransaction ? 'PUT' : 'POST';
      const body = editingTransaction 
        ? { ...formData, id: editingTransaction.id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) throw new Error('Failed to save transaction');

      await fetchTransactions();
      handleClose();
    } catch (err) {
      setError('Failed to save transaction');
      console.error('Error:', err);
    }
  };

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1">
            Transactions
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpen}
          >
            Add Transaction
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {transactions.map((transaction) => (
            <Grid item xs={12} sm={6} md={4} key={transaction.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="h6">{transaction.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(transaction.date).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body1" sx={{ mt: 1 }}>
                        {transaction.category_emoji} {transaction.category_name}
                      </Typography>
                      <Typography 
                        variant="h6" 
                        color={transaction.type === 'income' ? 'success.main' : 'error.main'}
                      >
                        {transaction.type === 'income' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                      </Typography>
                      {transaction.description && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {transaction.description}
                        </Typography>
                      )}
                      {transaction.is_recurring && (
                        <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                          🔄 Recurring {transaction.recurrence_pattern}
                        </Typography>
                      )}
                    </Box>
                    <Box>
                      <IconButton onClick={() => handleEdit(transaction)} size="small">
                        <EditIcon />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(transaction.id)} size="small" color="error">
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingTransaction ? 'Edit Transaction' : 'New Transaction'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                fullWidth
                required
              />
              
              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                fullWidth
                multiline
                rows={2}
              />

              <TextField
                label="Amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                fullWidth
                required
                inputProps={{ step: "0.01" }}
              />

              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Type"
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                >
                  <MenuItem value="expense">Expense</MenuItem>
                  <MenuItem value="income">Income</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category_id}
                  label="Category"
                  onChange={(e) => setFormData(prev => ({ ...prev, category_id: e.target.value }))}
                >
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.emoji} {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_recurring}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      is_recurring: e.target.checked,
                      recurrence_end_date: e.target.checked ? formData.date : null
                    }))}
                  />
                }
                label="Recurring Transaction"
              />

              {formData.is_recurring && (
                <>
                  <FormControl fullWidth>
                    <InputLabel>Recurrence Pattern</InputLabel>
                    <Select
                      value={formData.recurrence_pattern}
                      label="Recurrence Pattern"
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        recurrence_pattern: e.target.value 
                      }))}
                    >
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="monthly">Monthly</MenuItem>
                      <MenuItem value="yearly">Yearly</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    label="Recurrence End Date"
                    type="date"
                    value={formData.recurrence_end_date || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      recurrence_end_date: e.target.value 
                    }))}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button 
              onClick={handleSubmit}
              variant="contained"
              disabled={!formData.name || !formData.amount || !formData.category_id}
            >
              {editingTransaction ? 'Save Changes' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}