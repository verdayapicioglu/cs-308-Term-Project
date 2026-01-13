import React, { useState } from 'react';
import { productManagerAPI } from '../api';
import { generateInvoicePdf } from '../invoiceUtils';
import InvoiceModal from '../ProductManager/InvoiceModal';
import './InvoiceManagement.css';

function InvoiceManagement() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: ''
  });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!dateRange.start_date || !dateRange.end_date) {
      setError('Please select both start and end dates');
      setLoading(false);
      return;
    }

    try {
      const response = await productManagerAPI.getInvoices(
        dateRange.start_date,
        dateRange.end_date
      );
      setInvoices(response.data.invoices || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load invoices');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (invoice) => {
    // Calculate subtotal and tax for the modal
    const totalPrice = parseFloat(invoice.total_price || 0);
    const subtotal = totalPrice / 1.18;
    const tax = totalPrice - subtotal;
    
    const invoiceWithCalculations = {
      ...invoice,
      subtotal: subtotal,
      tax: tax,
      total: totalPrice
    };
    
    setSelectedInvoice(invoiceWithCalculations);
    setShowModal(true);
  };

  const handleDownloadPDF = (invoice) => {
    try {
      // Convert invoice to format expected by generateInvoicePdf
      const totalPrice = parseFloat(invoice.total_price || 0);
      
      // Calculate subtotal and tax (assuming 18% VAT included in total)
      const subtotal = totalPrice / 1.18;
      const tax = totalPrice - subtotal;
      
      const addressParts = invoice.delivery_address ? invoice.delivery_address.split(',') : [];
      
      const orderData = {
        id: invoice.delivery_id,
        customerName: invoice.customer_name,
        customerEmail: invoice.customer_email,
        date: invoice.order_date,
        address: {
          line1: addressParts[0]?.trim() || invoice.delivery_address || '',
          line2: addressParts[1]?.trim() || '',
          city: addressParts[addressParts.length - 1]?.trim() || '',
          zip: '',
          country: 'Turkey'
        },
        paymentMethod: 'Online',
        items: invoice.items.map(item => ({
          name: item.product_name,
          quantity: item.quantity,
          price: parseFloat(item.price)
        })),
        subtotal: subtotal,
        tax: tax,
        total: totalPrice
      };
      
      generateInvoicePdf(orderData);
    } catch (err) {
      console.error('Error generating invoice:', err);
      alert('Failed to generate invoice. Please try again.');
    }
  };

  const handlePrintAll = () => {
    invoices.forEach(invoice => {
      setTimeout(() => {
        handlePrint(invoice);
      }, 100);
    });
  };

  return (
    <div className="invoice-management-container">
      <h1 className="invoice-title">Invoice Management</h1>

      <form onSubmit={handleSearch} className="invoice-search-form">
        <div className="invoice-date-inputs">
          <div className="invoice-date-group">
            <label>Start Date</label>
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
              required
            />
          </div>
          <div className="invoice-date-group">
            <label>End Date</label>
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="invoice-search-btn" disabled={loading}>
            {loading ? 'Loading...' : 'Search Invoices'}
          </button>
        </div>
      </form>

      {error && <div className="invoice-error">{error}</div>}

      {invoices.length > 0 && (
        <div className="invoice-actions-bar">
          <span className="invoice-count">{invoices.length} invoices found</span>
          <button onClick={handlePrintAll} className="invoice-print-all-btn">
            Print All
          </button>
        </div>
      )}

      <div className="invoice-list">
        {invoices.map((invoice, index) => (
          <div key={index} className="invoice-card">
            <div className="invoice-card-header">
              <div>
                <h3>Invoice #{invoice.delivery_id}</h3>
                <p className="invoice-customer">{invoice.customer_name} ({invoice.customer_email})</p>
                <p className="invoice-date">Date: {invoice.order_date}</p>
              </div>
              <div className="invoice-status-badge" data-status={invoice.status}>
                {invoice.status}
              </div>
            </div>

            <div className="invoice-items-preview">
              {invoice.items.map((item, idx) => (
                <div key={idx} className="invoice-item-preview">
                  <span>{item.product_name}</span>
                  <span>x{item.quantity}</span>
                  <span>{item.price * item.quantity} TL</span>
                </div>
              ))}
            </div>

            <div className="invoice-card-footer">
              <div className="invoice-total">
                <strong>Total: {invoice.total_price} TL</strong>
              </div>
              <div className="invoice-actions">
                <button
                  onClick={() => handlePrint(invoice)}
                  className="invoice-action-btn print"
                >
                  Print
                </button>
                <button
                  onClick={() => handleDownloadPDF(invoice)}
                  className="invoice-action-btn download"
                >
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {invoices.length === 0 && !loading && dateRange.start_date && dateRange.end_date && (
        <div className="invoice-empty">
          No invoices found for the selected date range.
        </div>
      )}

      {showModal && selectedInvoice && (
        <InvoiceModal
          order={selectedInvoice}
          onClose={() => {
            setShowModal(false);
            setSelectedInvoice(null);
          }}
        />
      )}
    </div>
  );
}

export default InvoiceManagement;


