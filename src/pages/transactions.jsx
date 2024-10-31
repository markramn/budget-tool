import { useState, useEffect } from 'react';
import Layout from '../components/layout/layout.jsx';
import { useAuth } from '../context/auth/AuthContext';
import { FilterList, Sort, DateRange } from '@mui/icons-material'; // Add these imports
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
  Grid2,
  IconButton,
  Typography,
  MenuItem,
  FormControl,
  FormLabel,
  InputLabel,
  Select,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Chip,
  Drawer,
  Checkbox,
  Stack
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

const API_URL = import.meta.env.VITE_API_URL;

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

  const [sortConfig, setSortConfig] = useState({ field: 'date', direction: 'desc' });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Initialize filters with current month
  const [filters, setFilters] = useState({
    startDate: getFirstDayOfMonth(),
    endDate: getLastDayOfMonth(),
    types: [],
    categories: [],
  });

  const [groupBy, setGroupBy] = useState('month'); // Set default grouping to month

  // Add a reset filters function
  const resetFilters = () => {
    setFilters({
      startDate: getFirstDayOfMonth(),
      endDate: getLastDayOfMonth(),
      types: [],
      categories: [],
    });
    setGroupBy('month');
  };

  // Sorting function
  const getSortedTransactions = (transactions) => {
    if (!sortConfig.field) return transactions;
  
    return [...transactions].sort((a, b) => {
      if (sortConfig.field === 'amount') {
        const aValue = a.type === 'expense' ? -a.amount : a.amount;
        const bValue = b.type === 'expense' ? -b.amount : b.amount;
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
  
      if (sortConfig.field === 'date') {
        return sortConfig.direction === 'asc'
          ? new Date(a.date) - new Date(b.date)
          : new Date(b.date) - new Date(a.date);
      }
  
      // Handle category sorting safely
      if (sortConfig.field === 'category') {
        const aCategoryName = a.category_name || '';
        const bCategoryName = b.category_name || '';
        return sortConfig.direction === 'asc'
          ? aCategoryName.localeCompare(bCategoryName)
          : bCategoryName.localeCompare(aCategoryName);
      }
  
      // Handle other string fields safely
      const aValue = a[sortConfig.field] || '';
      const bValue = b[sortConfig.field] || '';
      return sortConfig.direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });
  };

  // Filtering function
  const getFilteredTransactions = (transactions) => {
    return transactions.filter(transaction => {
      const dateMatches = (!filters.startDate || new Date(transaction.date) >= filters.startDate) &&
        (!filters.endDate || new Date(transaction.date) <= filters.endDate);
      const typeMatches = filters.types.length === 0 || filters.types.includes(transaction.type);
      const categoryMatches = filters.categories.length === 0 ||
        filters.categories.includes(transaction.category_id);

      return dateMatches && typeMatches && categoryMatches;
    });
  };

  // Grouping function
  const getGroupedTransactions = (transactions) => {
    if (!groupBy) return { 'All Transactions': transactions };

    return transactions.reduce((groups, transaction) => {
      let groupKey;
      switch (groupBy) {
        case 'type':
          groupKey = transaction.type === 'income' ? 'Income' : 'Expenses';
          break;
        case 'category':
          groupKey = transaction.category_name;
          break;
        case 'month':
          groupKey = new Date(transaction.date).toLocaleString('default', {
            month: 'long',
            year: 'numeric'
          });
          break;
        default:
          groupKey = 'All Transactions';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(transaction);
      return groups;
    }, {});
  };

  // Calculate totals for the current view
  const calculateTotals = (transactions) => {
    return transactions.reduce((totals, t) => {
      if (t.type === 'income') {
        totals.income += Number(t.amount);
      } else {
        totals.expenses += Number(t.amount);
      }
      totals.net = totals.income - totals.expenses;
      return totals;
    }, { income: 0, expenses: 0, net: 0 });
  };

  // Get processed transactions
  const processedTransactions = getFilteredTransactions(getSortedTransactions(transactions));
  const groupedTransactions = getGroupedTransactions(processedTransactions);
  const totals = calculateTotals(processedTransactions);

  // Header component with sorting and filtering controls
  const TableHeader = ({ field, label, flex, align = 'left', sx = {} }) => (
    <Box
      onClick={() => setSortConfig({
        field,
        direction: sortConfig.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc'
      })}
      sx={{
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
        flex: flex || 1,
        p: 1,
        transition: 'background-color 0.2s',
        '&:hover': {
          bgcolor: 'action.hover',
          '& .MuiTypography-root': {
            color: 'primary.main'
          }
        },
        ...sx
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: sortConfig.field === field ? 600 : 400,
          color: sortConfig.field === field ? 'primary.main' : 'text.secondary',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontSize: '0.75rem',
          transition: 'color 0.2s'
        }}
      >
        {label}
      </Typography>
      <Sort
        fontSize="small"
        sx={{
          ml: 0.5,
          opacity: sortConfig.field === field ? 1 : 0,
          transform: sortConfig.field === field && sortConfig.direction === 'desc' ? 'rotate(180deg)' : 'none',
          transition: 'all 0.2s',
          color: 'primary.main',
          width: 16,
          height: 16
        }}
      />
    </Box>
  );

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

      console.log('Submitting transaction with data:', body);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to save transaction');
      }

      await fetchTransactions();
      handleClose();
    } catch (err) {
      setError(`Failed to save transaction: ${err.message}`);
      console.error('Transaction save error:', err);
    }
  };

  // Add these helper functions at the beginning of the file
  function getFirstDayOfMonth(date = new Date()) {
    const firstDay = new Date(date);
    firstDay.setDate(1);
    firstDay.setHours(0, 0, 0, 0);
    return firstDay;
  }

  function getLastDayOfMonth(date = new Date()) {
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    lastDay.setHours(23, 59, 59, 999);
    return lastDay;
  }

  // Helper to format dates for display
  function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

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
        {/* Header Section */}
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 2,
          mb: 4
        }}>
          <Box>
            <Typography variant="h4" component="h1">
              Transactions
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {processedTransactions.length} transactions total
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setFilterDrawerOpen(true)}
              size="large"
            >
              Filters
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpen}
              size="large"
            >
              Add Transaction
            </Button>
          </Stack>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Summary Cards */}
        <Grid2 container spacing={3} sx={{ mb: 4 }}>
          <Grid2 xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">Total Income</Typography>
                <Typography variant="h4" color="success.main" sx={{ mt: 1 }}>
                  ${totals.income.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid2>
          <Grid2 xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">Total Expenses</Typography>
                <Typography variant="h4" color="error.main" sx={{ mt: 1 }}>
                  ${totals.expenses.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid2>
          <Grid2 xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">Net Balance</Typography>
                <Typography
                  variant="h4"
                  color={totals.net >= 0 ? 'success.main' : 'error.main'}
                  sx={{ mt: 1 }}
                >
                  ${totals.net.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid2>
        </Grid2>

        {/* Active Filters */}
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {filters.startDate && (
              <Chip
                icon={<DateRange />}
                label={`From ${formatDate(filters.startDate)}`}
                onDelete={() => setFilters(prev => ({ ...prev, startDate: null }))}
                color="primary"
                variant="outlined"
              />
            )}
            {filters.endDate && (
              <Chip
                icon={<DateRange />}
                label={`To ${formatDate(filters.endDate)}`}
                onDelete={() => setFilters(prev => ({ ...prev, endDate: null }))}
                color="primary"
                variant="outlined"
              />
            )}
            {groupBy && (
              <Chip
                label={`Grouped by ${groupBy}`}
                onDelete={() => setGroupBy(null)}
                color="primary"
              />
            )}
            {(filters.startDate || filters.endDate || groupBy) && (
              <Chip
                label="Clear All"
                onDelete={() => {
                  setFilters({
                    startDate: null,
                    endDate: null,
                    types: [],
                    categories: [],
                  });
                  setGroupBy(null);
                }}
                color="error"
                variant="outlined"
              />
            )}
          </Stack>
        </Box>

        {/* Transactions List */}
        {Object.entries(groupedTransactions).map(([groupName, groupTransactions]) => (
          <Box key={groupName} sx={{ mb: 4 }}>
            {/* Group Header */}
            {groupBy && (
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2
              }}>
                <Typography variant="h6">
                  {groupName}
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">
                  {groupTransactions.length} transactions
                </Typography>
              </Box>
            )}

            {/* Transactions Table */}
            <Card>
              {/* Table Header */}
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                p: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper'
              }}>
                <TableHeader field="name" label="Name/Description" flex={2} />
                <TableHeader
                  field="category"
                  label="Category"
                  sx={{ display: { xs: 'none', sm: 'flex' } }}
                />
                <TableHeader
                  field="date"
                  label="Date"
                  sx={{ display: { xs: 'none', md: 'flex' } }}
                />
                <TableHeader field="amount" label="Amount" align="right" />
                <Box sx={{ width: 100 }} />
              </Box>

              {/* Transaction Rows */}
              {groupTransactions.map((transaction) => (
                <Box
                  key={transaction.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                    borderLeft: '4px solid',
                    borderLeftColor: transaction.type === 'income' ? 'success.main' : 'error.main',
                  }}
                >
                  {/* Name/Description */}
                  <Box sx={{ flex: 2 }}>
                    <Typography variant="body1">
                      {transaction.name}
                      {transaction.is_recurring && (
                        <Typography
                          component="span"
                          variant="caption"
                          color="primary"
                          sx={{ ml: 1 }}
                        >
                          🔄 {transaction.recurrence_pattern}
                        </Typography>
                      )}
                    </Typography>
                    {transaction.description && (
                      <Typography variant="caption" color="text.secondary">
                        {transaction.description}
                      </Typography>
                    )}
                  </Box>

                  {/* Category */}
                  <Typography
                    variant="body2"
                    sx={{ flex: 1, display: { xs: 'none', sm: 'block' } }}
                  >
                    {transaction.category_emoji} {transaction.category_name}
                  </Typography>

                  {/* Date */}
                  <Typography
                    variant="body2"
                    sx={{ flex: 1, display: { xs: 'none', md: 'block' } }}
                  >
                    {new Date(transaction.date).toLocaleDateString()}
                  </Typography>

                  {/* Amount */}
                  <Typography
                    variant="body1"
                    color={transaction.type === 'income' ? 'success.main' : 'error.main'}
                    sx={{ flex: 1, textAlign: 'right', fontWeight: 'medium' }}
                  >
                    {transaction.type === 'income' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                  </Typography>

                  {/* Actions */}
                  <Box sx={{ width: 100, textAlign: 'right' }}>
                    <IconButton
                      onClick={() => handleEdit(transaction)}
                      size="small"
                      sx={{ mr: 1 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      onClick={() => handleDelete(transaction.id)}
                      size="small"
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ))}

              {/* Group Summary */}
              {groupTransactions.length > 0 && (
                <Box sx={{
                  p: 2,
                  borderTop: '2px solid',
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 3
                }}>
                  <Typography variant="subtitle2">
                    Group Total: ${calculateTotals(groupTransactions).net.toFixed(2)}
                  </Typography>
                </Box>
              )}

              {/* Empty State */}
              {groupTransactions.length === 0 && (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary">
                    No transactions found. Click "Add Transaction" to create one.
                  </Typography>
                </Box>
              )}
            </Card>
          </Box>
        ))}

        {/* Filter Drawer */}
        <Drawer
          anchor="right"
          open={filterDrawerOpen}
          onClose={() => setFilterDrawerOpen(false)}
        >
          <Box sx={{ width: 320, p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>Filters & Grouping</Typography>

            <Stack spacing={3}>
              <TextField
                label="Start Date"
                type="date"
                value={filters.startDate ? formatDate(filters.startDate) : ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  startDate: e.target.value ? new Date(e.target.value) : getFirstDayOfMonth()
                }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                label="End Date"
                type="date"
                value={filters.endDate ? formatDate(filters.endDate) : ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  endDate: e.target.value ? new Date(e.target.value) : getLastDayOfMonth()
                }))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <Button
                variant="outlined"
                onClick={resetFilters}
                fullWidth
              >
                Reset to Current Month
              </Button>

              <FormControl fullWidth>
                <InputLabel>Group By</InputLabel>
                <Select
                  value={groupBy || ''}
                  label="Group By"
                  onChange={(e) => setGroupBy(e.target.value || null)}
                >
                  <MenuItem value="">No Grouping</MenuItem>
                  <MenuItem value="type">Transaction Type</MenuItem>
                  <MenuItem value="category">Category</MenuItem>
                  <MenuItem value="month">Month</MenuItem>
                </Select>
              </FormControl>

              <FormControl component="fieldset">
                <FormLabel component="legend">Transaction Types</FormLabel>
                <Stack>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={filters.types.includes('income')}
                        onChange={(e) => {
                          setFilters(prev => ({
                            ...prev,
                            types: e.target.checked
                              ? [...prev.types, 'income']
                              : prev.types.filter(t => t !== 'income')
                          }));
                        }}
                      />
                    }
                    label="Income"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={filters.types.includes('expense')}
                        onChange={(e) => {
                          setFilters(prev => ({
                            ...prev,
                            types: e.target.checked
                              ? [...prev.types, 'expense']
                              : prev.types.filter(t => t !== 'expense')
                          }));
                        }}
                      />
                    }
                    label="Expenses"
                  />
                </Stack>
              </FormControl>

              <Button
                variant="outlined"
                onClick={() => setFilterDrawerOpen(false)}
                fullWidth
              >
                Done
              </Button>
            </Stack>
          </Box>
        </Drawer>

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