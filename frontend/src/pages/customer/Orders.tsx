import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export const Orders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'current' | 'previous'>('current');
  
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });

  const fetchOrders = async (type: 'current' | 'previous') => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/v1/customer/orders?type=${type}`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      setOrders(res.data.data);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(view);
  }, [view]);

  const viewDetails = async (id: string) => {
    setDetailsLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/v1/customer/orders/${id}`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      setSelectedOrder(res.data.data);
    } catch (error) {
      toast.error('Failed to load order details');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleReorder = async (id: string) => {
    try {
      await axios.post(`http://localhost:5000/api/v1/customer/orders/${id}/reorder`, {}, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      toast.success('Cart populated with items! Go to checkout.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reorder');
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`http://localhost:5000/api/v1/customer/reviews`, {
        orderId: selectedOrder.id,
        restaurantId: selectedOrder.restaurantId,
        rating: reviewForm.rating,
        comment: reviewForm.comment
      }, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      toast.success('Review submitted successfully!');
      viewDetails(selectedOrder.id); // Refresh to show review
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit review');
    }
  };

  if (selectedOrder) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm p-6">
        <button onClick={() => setSelectedOrder(null)} className="mb-4 text-indigo-600 font-medium hover:text-indigo-800">
          &larr; Back to Orders
        </button>
        {detailsLoading ? (
          <div className="text-center py-10">Loading details...</div>
        ) : (
          <div>
            <div className="flex justify-between items-start border-b pb-4 mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Order #{selectedOrder.id.slice(0,8)}</h2>
                <p className="text-gray-500">From {selectedOrder.restaurant.name}</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                  {selectedOrder.status}
                </span>
                <p className="font-bold text-xl mt-2">${selectedOrder.total}</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-bold text-lg mb-2">Items</h3>
              <ul className="divide-y divide-gray-200">
                {selectedOrder.items.map((item: any) => (
                  <li key={item.id} className="py-2 flex justify-between">
                    <div>
                      <span className="font-medium">{item.quantity}x</span> {item.food.name}
                    </div>
                    <span>${(item.unitPrice * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex space-x-4 mb-8">
              <button onClick={() => handleReorder(selectedOrder.id)} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
                Reorder Items
              </button>
            </div>

            {selectedOrder.status === 'DELIVERED' && selectedOrder.reviews.length === 0 && (
              <div className="bg-gray-50 p-6 rounded-lg border">
                <h3 className="font-bold text-lg mb-4">Leave a Review</h3>
                <form onSubmit={submitReview}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Rating (1-5)</label>
                    <select value={reviewForm.rating} onChange={e => setReviewForm({...reviewForm, rating: Number(e.target.value)})} className="mt-1 p-2 border rounded block w-32">
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Stars</option>)}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Comment</label>
                    <textarea value={reviewForm.comment} onChange={e => setReviewForm({...reviewForm, comment: e.target.value})} className="mt-1 p-2 border rounded block w-full h-24" />
                  </div>
                  <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">Submit Review</button>
                </form>
              </div>
            )}
            
            {selectedOrder.reviews.length > 0 && (
              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <h3 className="font-bold text-lg mb-2 text-green-800">Your Review</h3>
                <p className="text-yellow-500 font-bold">{"★".repeat(selectedOrder.reviews[0].rating)}</p>
                <p className="text-gray-700 mt-2">{selectedOrder.reviews[0].comment}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h2>
      
      <div className="flex space-x-4 mb-6 border-b border-gray-200 pb-2">
        <button 
          onClick={() => setView('current')}
          className={`pb-2 px-2 font-medium ${view === 'current' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Current Orders
        </button>
        <button 
          onClick={() => setView('previous')}
          className={`pb-2 px-2 font-medium ${view === 'previous' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Previous Orders
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-lg">No {view} orders yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">{order.restaurant.name}</h3>
                <p className="text-gray-500 text-sm">{new Date(order.createdAt).toLocaleDateString()} • {order.items.length} items • ${order.total}</p>
                <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  {order.status}
                </span>
              </div>
              <button onClick={() => viewDetails(order.id)} className="border border-indigo-600 text-indigo-600 px-4 py-2 rounded hover:bg-indigo-50 font-medium">
                View Details
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
