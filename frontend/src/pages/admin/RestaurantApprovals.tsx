import { useEffect, useState } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { Store, MapPin, Phone, Clock, FileText, CheckCircle, XCircle, Search, AlertCircle } from 'lucide-react';

interface Restaurant {
  id: string;
  name: string;
  description: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  address: string;
  phone: string;
  email: string;
  openingHours: string;
  businessInfo: string;
  createdAt: string;
  documents: {
    id: string;
    type: string;
    url: string;
  }[];
  owner: {
    name: string;
    email: string;
  };
}

export const RestaurantApprovals = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchRestaurants = async () => {
    try {
      const response = await api.get('/admin/restaurants');
      const formattedRestaurants = response.data.data.map((r: any) => ({
        ...r,
        owner: {
          name: `${r.owner.firstName} ${r.owner.lastName}`,
          email: r.owner.email
        }
      }));
      setRestaurants(formattedRestaurants.filter((r: any) => r.status === 'PENDING' || r.status === 'UNDER_REVIEW'));
    } catch (error) {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const handleUpdateStatus = async (restaurantId: string, status: string, notes?: string) => {
    try {
      setIsUpdating(true);
      await api.put(`/admin/restaurants/${restaurantId}/review`, { status, reason: notes });
      toast.success(`Restaurant application ${status.toLowerCase()} successfully`);
      setSelectedRestaurant(null);
      fetchRestaurants();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restaurant Approvals</h1>
          <p className="text-gray-600 mt-1">Review and manage incoming restaurant applications</p>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* List Panel */}
        <div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                placeholder="Search applications..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {restaurants.length === 0 ? (
              <div className="text-center p-8 text-gray-500">
                <Store className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p>No applications to review</p>
              </div>
            ) : (
              restaurants.map(restaurant => (
                <button
                  key={restaurant.id}
                  onClick={() => setSelectedRestaurant(restaurant)}
                  className={`w-full text-left p-4 rounded-lg transition-colors ${
                    selectedRestaurant?.id === restaurant.id
                      ? 'bg-red-50 border border-red-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold text-gray-900 truncate">{restaurant.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      restaurant.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      restaurant.status === 'UNDER_REVIEW' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {restaurant.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1 truncate">{restaurant.owner.name}</p>
                  <p className="text-xs text-gray-400 mt-2">Applied {new Date(restaurant.createdAt).toLocaleDateString()}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          {selectedRestaurant ? (
            <>
              <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedRestaurant.name}</h2>
                  <p className="text-gray-500 mt-1 flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      selectedRestaurant.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      selectedRestaurant.status === 'UNDER_REVIEW' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedRestaurant.status}
                    </span>
                    • ID: {selectedRestaurant.id.slice(0, 8)}
                  </p>
                </div>
                
                <div className="flex gap-3">
                  {selectedRestaurant.status === 'PENDING' && (
                    <button
                      onClick={() => handleUpdateStatus(selectedRestaurant.id, 'UNDER_REVIEW')}
                      disabled={isUpdating}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      Start Review
                    </button>
                  )}
                  {selectedRestaurant.status === 'UNDER_REVIEW' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(selectedRestaurant.id, 'REJECTED')}
                        disabled={isUpdating}
                        className="px-4 py-2 border border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center gap-2"
                      >
                        <XCircle size={18} />
                        Reject
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedRestaurant.id, 'APPROVED')}
                        disabled={isUpdating}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                      >
                        <CheckCircle size={18} />
                        Approve
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-8">
                  {/* General Info */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Store size={20} className="text-gray-500"/>
                        Restaurant Details
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-500">Description</p>
                          <p className="text-gray-900 mt-1">{selectedRestaurant.description}</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <MapPin size={18} className="text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-500">Address</p>
                            <p className="text-gray-900">{selectedRestaurant.address}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Phone size={18} className="text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Contact</p>
                            <p className="text-gray-900">{selectedRestaurant.phone} • {selectedRestaurant.email}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Clock size={18} className="text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-500">Opening Hours</p>
                            <pre className="text-gray-900 font-sans text-sm mt-1 bg-gray-50 p-3 rounded border border-gray-100 whitespace-pre-wrap">
                              {selectedRestaurant.openingHours}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Business & Docs */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <FileText size={20} className="text-gray-500"/>
                        Business Information
                      </h3>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <pre className="text-sm text-gray-800 font-sans whitespace-pre-wrap">
                          {selectedRestaurant.businessInfo}
                        </pre>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Documents</h3>
                      {selectedRestaurant.documents?.length > 0 ? (
                        <div className="space-y-3">
                          {selectedRestaurant.documents.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-red-300 transition-colors">
                              <div className="flex items-center gap-3">
                                <FileText size={18} className="text-gray-400" />
                                <span className="font-medium text-gray-700">{doc.type.replace(/_/g, ' ')}</span>
                              </div>
                              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm text-red-600 hover:text-red-700 font-medium">
                                View Document
                              </a>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                          <AlertCircle size={20} className="text-yellow-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-yellow-800">No documents provided</p>
                            <p className="text-xs text-yellow-600 mt-1">This application might be incomplete.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
              <CheckSquare className="h-16 w-16 text-gray-200 mb-4" />
              <p className="text-lg font-medium text-gray-900">Select an application</p>
              <p className="text-sm mt-1 text-center max-w-sm">
                Choose a restaurant application from the list to review its details and documents.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
