import React from 'react';
import './InvoiceModal.css';

const InvoiceModal = ({ order, onClose }) => {
    if (!order) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="invoice-modal-overlay">
            <div className="invoice-modal-content">
                <div className="invoice-header">
                    <div className="invoice-logo">
                        <h1>PatiHouse</h1>
                        <p>Premium Pet Supplies</p>
                    </div>
                    <div className="invoice-details">
                        <h2>INVOICE</h2>
                        <div className="invoice-dates">
                            <p>Invoice #: {order.delivery_id}</p>
                            <p>Date: {order.order_date}</p>
                            {order.delivery_date && <p>Delivery Date: {order.delivery_date}</p>}
                        </div>
                    </div>
                </div>

                <div className="invoice-body">
                    <div className="invoice-from">
                        <h3>From:</h3>
                        <p><strong>Pet Shop Inc.</strong></p>
                        <p>123 Pet Street</p>
                        <p>Istanbul, Turkey 34000</p>
                        <p>support@petshop.com</p>
                    </div>
                    <div className="invoice-to">
                        <h3>Bill To:</h3>
                        <p><strong>{order.customer_name}</strong></p>
                        <p>{order.delivery_address}</p>
                        <p>{order.customer_email}</p>
                    </div>
                </div>

                <table className="invoice-items">
                    <thead>
                        <tr>
                            <th>Item Description</th>
                            <th style={{ textAlign: 'center' }}>Qty</th>
                            <th style={{ textAlign: 'right' }}>Unit Price</th>
                            <th style={{ textAlign: 'right' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(order.items || []).map((item, index) => (
                            <tr key={index}>
                                <td>{item.product_name}</td>
                                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                                <td className="amount">${(item.price || 0).toFixed(2)}</td>
                                <td className="amount">${((item.price || 0) * item.quantity).toFixed(2)}</td>
                            </tr>
                        ))}
                        {/* Fallback for old order structure if needed */}
                        {(!order.items || order.items.length === 0) && (
                            <tr>
                                <td>{order.product_name}</td>
                                <td style={{ textAlign: 'center' }}>{order.quantity}</td>
                                <td className="amount">${(order.total_price / order.quantity).toFixed(2)}</td>
                                <td className="amount">${(order.total_price).toFixed(2)}</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                <div className="invoice-summary">
                    <div className="summary-row total">
                        <span>Grand Total:</span>
                        <span>${(order.total_price || 0).toFixed(2)}</span>
                    </div>
                </div>

                <div className="invoice-footer">
                    <p>Thank you for your business!</p>
                    <p>For questions concerning this invoice, please contact support@petshop.com</p>
                </div>

                <div className="invoice-actions">
                    <button className="btn-print" onClick={handlePrint}>Print Invoice</button>
                    <button className="btn-close" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default InvoiceModal;
