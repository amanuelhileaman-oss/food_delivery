import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export const Addresses: React.FC = () => {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    label: '', street: '', city: '', state: '', zipCode: '', country: '', isDefault: false
  });

  const fetchAddresses = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/v1/customer/addresses', {
        withCredentials: true,
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      setAddresses(res.data.data);
    } catch (error) {
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/v1/customer/addresses', formData, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      toast.success('Address added');
      setShowForm(false);
      setFormData({ label: '', street: '', city: '', state: '', zipCode: '', country: '', isDefault: false });
      fetchAddresses();
    } catch (error) {
      toast.error('Failed to add address');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`http://localhost:5000/api/v1/customer/addresses/${id}`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      toast.success('Address deleted');
      fetchAddresses();
    } catch (error) {
      toast.error('Failed to delete address');
    }
  };

  const setAsDefault = async (id: string, address: any) => {
    try {
      await axios.put(`http://localhost:5000/api/v1/customer/addresses/${id}`, { ...address, isDefault: true }, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      toast.success('Default address updated');
      fetchAddresses();
    } catch (error) {
      toast.error('Failed to update address');
    }
  };

  if (loading) return <div className="text-center py-10">Loading addresses...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">My Addresses</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
          {showForm ? 'Cancel' : 'Add New Address'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow mb-8 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input required placeholder="Label (e.g. Home)" name="label" value={formData.label} onChange={handleChange} className="p-2 border rounded" />
            <input required placeholder="Street" name="street" value={formData.street} onChange={handleChange} className="p-2 border rounded" />
            <input required placeholder="City" name="city" value={formData.city} onChange={handleChange} className="p-2 border rounded" />
            <input required placeholder="State" name="state" value={formData.state} onChange={handleChange} className="p-2 border rounded" />
            <input required placeholder="Zip Code" name="zipCode" value={formData.zipCode} onChange={handleChange} className="p-2 border rounded" />
            <input required placeholder="Country" name="country" value={formData.country} onChange={handleChange} className="p-2 border rounded" />
            <input type="number" step="any" min="-90" max="90" placeholder="Latitude (-90 to 90)" name="latitude" onChange={handleChange} className="p-2 border rounded" />
            <input type="number" step="any" min="-180" max="180" placeholder="Longitude (-180 to 180)" name="longitude" onChange={handleChange} className="p-2 border rounded" />
          </div>
          <div className="flex items-center">
            <input type="checkbox" name="isDefault" checked={formData.isDefault} onChange={handleChange} className="mr-2" />
            <label>Set as default address</label>
          </div>
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">Save Address</button>
        </form>
      )}

      {addresses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500">No addresses saved yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map(addr => (
            <div key={addr.id} className={`bg-white p-6 rounded-lg shadow border-2 ${addr.isDefault ? 'border-indigo-500' : 'border-transparent'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{addr.label || 'Address'}</h3>
                  {addr.isDefault && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">Default</span>}
                </div>
              </div>
              <p className="text-gray-600 mb-4">
                {addr.street}<br/>
                {addr.city}, {addr.state} {addr.zipCode}<br/>
                {addr.country}
              </p>
              <div className="flex space-x-3">
                {!addr.isDefault && (
                  <button onClick={() => setAsDefault(addr.id, addr)} className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">Set as Default</button>
                )}
                <button onClick={() => handleDelete(addr.id)} className="text-red-600 hover:text-red-900 text-sm font-medium">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
