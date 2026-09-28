import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Star, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const CustomerDashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [popularRestaurants, setPopularRestaurants] = useState<any[]>([]);
  const [nearbyRestaurants, setNearbyRestaurants] = useState<any[]>([]);
  const [recommendedFoods, setRecommendedFoods] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const config = {
        withCredentials: true,
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      };

      const [catsRes, popRes, nearbyRes, recRes] = await Promise.all([
        axios.get('http://localhost:5000/api/v1/customer/categories', config),
        axios.get('http://localhost:5000/api/v1/customer/restaurants?isPopular=true', config),
        // Defaulting user location to 10,10 for testing nearby
        axios.get('http://localhost:5000/api/v1/customer/restaurants?isNearby=true&lat=10&lng=10', config),
        axios.get('http://localhost:5000/api/v1/customer/recommended-foods', config)
      ]);

      setCategories(catsRes.data.data);
      setPopularRestaurants(popRes.data.data);
      setNearbyRestaurants(nearbyRes.data.data);
      setRecommendedFoods(recRes.data.data);
    } catch (err: any) {
      setError('Unable to load dashboard data. Please try again later.');
      toast.error('Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setSearchActive(false);
      return;
    }
    
    setSearchActive(true);
    setSearchLoading(true);
    try {
      const config = {
        withCredentials: true,
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      };
      const res = await axios.get(`http://localhost:5000/api/v1/customer/restaurants?search=${encodeURIComponent(searchTerm)}`, config);
      setRestaurants(res.data.data);
    } catch (err) {
      toast.error('Unable to load restaurants.');
      setRestaurants([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchActive(false);
  };

  const renderRestaurantGrid = (items: any[], emptyMsg: string) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
          <p className="text-gray-500">{emptyMsg}</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((restaurant: any) => (
          <div key={restaurant.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
            <div className="h-40 bg-gray-200 w-full relative">
              {restaurant.imageBanner ? (
                <img src={restaurant.imageBanner} alt={restaurant.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
              )}
            </div>
            <div className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-gray-900">{restaurant.name}</h3>
                <div className="flex items-center gap-1 text-sm font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-full">
                  <Star size={14} className="text-yellow-500 fill-current" />
                  4.5
                </div>
              </div>
              <p className="text-sm text-gray-500 line-clamp-1">{restaurant.description || 'Delicious food delivered to you.'}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-indigo-600 text-white rounded">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* HEADER & SEARCH */}
      <header className="bg-indigo-600 rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">What are you craving today?</h1>
        <p className="text-indigo-100 mb-6">Discover the best food & drinks in your area.</p>
        <form onSubmit={handleSearch} className="relative max-w-xl flex">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search for restaurants..."
              className="w-full pl-10 pr-4 py-3 rounded-l-xl text-gray-900 focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button type="submit" className="bg-indigo-800 px-6 py-3 font-semibold hover:bg-indigo-900 transition-colors">
            Search
          </button>
          {searchActive && (
            <button type="button" onClick={clearSearch} className="bg-gray-200 text-gray-800 px-6 py-3 rounded-r-xl hover:bg-gray-300 font-semibold transition-colors">
              Clear
            </button>
          )}
        </form>
      </header>

      {/* SEARCH RESULTS */}
      {searchActive ? (
        <section>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Search Results</h2>
          {searchLoading ? (
            <div className="text-center py-10">Searching...</div>
          ) : (
            renderRestaurantGrid(restaurants, "No restaurants found.")
          )}
        </section>
      ) : (
        <>
          {/* CATEGORIES */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Categories</h2>
            {categories.length === 0 ? (
              <p className="text-gray-500">No categories found.</p>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-4">
                {categories.map(cat => (
                  <div key={cat.id} className="min-w-[120px] bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all">
                    <span className="font-medium text-gray-800">{cat.name}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* POPULAR RESTAURANTS */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Popular Restaurants</h2>
            {renderRestaurantGrid(popularRestaurants, "No popular restaurants found.")}
          </section>

          {/* NEARBY RESTAURANTS */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Nearby Restaurants</h2>
            {renderRestaurantGrid(nearbyRestaurants, "No nearby restaurants found.")}
          </section>

          {/* RECOMMENDED FOODS */}
          <section>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Recommended Foods</h2>
            {recommendedFoods.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
                <p className="text-gray-500">No recommendations available yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {recommendedFoods.map(food => (
                  <div key={food.id} className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md">
                    <h4 className="font-bold">{food.name}</h4>
                    <p className="text-sm text-gray-500">${food.price}</p>
                    <p className="text-xs text-indigo-600 mt-2">{food.restaurant?.name}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};
