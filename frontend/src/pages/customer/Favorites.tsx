import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

export const Favorites: React.FC = () => {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/v1/customer/favorites', {
        withCredentials: true,
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      setFavorites(res.data.data);
    } catch (error) {
      toast.error('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const removeFavorite = async (id: string) => {
    try {
      await axios.delete(`http://localhost:5000/api/v1/customer/favorites/${id}`, {
        withCredentials: true,
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      toast.success('Removed from favorites');
      setFavorites(favorites.filter(f => f.id !== id));
    } catch (error) {
      toast.error('Failed to remove favorite');
    }
  };

  if (loading) return <div className="text-center py-10">Loading favorites...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">My Favorites</h2>

      {favorites.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 text-lg">No favorite restaurants or foods yet.</p>
          <Link to="/customer" className="mt-4 inline-block text-indigo-600 font-medium hover:text-indigo-800">
            Discover restaurants
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          <div>
            <h3 className="text-xl font-bold mb-4">Favorite Restaurants</h3>
            {favorites.filter(f => f.restaurant).length === 0 ? (
              <p className="text-gray-500">No favorite restaurants yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favorites.filter(f => f.restaurant).map(fav => (
                  <div key={fav.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="h-48 bg-gray-200 relative">
                      {fav.restaurant.imageBanner ? (
                        <img src={fav.restaurant.imageBanner} alt={fav.restaurant.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">No Image</div>
                      )}
                      <button 
                        onClick={() => removeFavorite(fav.id)}
                        className="absolute top-3 right-3 bg-white p-2 rounded-full shadow hover:bg-gray-100 text-red-500"
                      >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                      </button>
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-gray-900">{fav.restaurant.name}</h3>
                      <div className="mt-4 flex space-x-3">
                        <Link to={`/customer/restaurant/${fav.restaurant.id}`} className="flex-1 text-center bg-indigo-600 text-white py-2 rounded-md font-medium hover:bg-indigo-700 transition-colors">
                          View Menu
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-xl font-bold mb-4">Favorite Foods</h3>
            {favorites.filter(f => f.food).length === 0 ? (
              <p className="text-gray-500">No favorite foods yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {favorites.filter(f => f.food).map(fav => (
                  <div key={fav.id} className="bg-white rounded-xl shadow-sm border p-4 relative">
                    <button 
                      onClick={() => removeFavorite(fav.id)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    >
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                    </button>
                    <h4 className="font-bold text-gray-900 pr-6">{fav.food.name}</h4>
                    <p className="text-gray-600">${fav.food.price}</p>
                    <p className="text-xs text-indigo-600 mt-2">{fav.food.restaurant?.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
