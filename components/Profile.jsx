import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Profile.css';
import { getMockUsers, saveMockUsers } from './authUtils';
import { authAPI, productManagerAPI } from './api';

const PROFILE_STORAGE_KEY = 'mock_profile_overview';

const DEFAULT_PROFILE = {
  id: '1',
  name: 'Admin User',
  email: 'admin@petstore.com',
  email: 'admin@petstore.com',
  phone: '+90 555 123 4567',
  taxId: '',
  homeAddress: '',
  memberSince: '2021-06-12',
  loyaltyTier: 'Gold',
  points: 12450,
  petsSupported: 3,
  lastLogin: '2025-11-10T18:15:00Z',
  bio: 'Premium member who loves caring for rescued pets and exploring sustainable products.',
  addresses: [
    {
      id: 'addr-istanbul',
      label: 'Home Nest',
      recipient: 'Admin User',
      phone: '+90 555 123 4567',
      lines: ['Akasyalı Street No: 21', 'Apt 4'],
      city: 'Kadıköy, Istanbul',
      postalCode: '34710',
      notes: 'Leave at the concierge. Loki (cat) is friendly.',
      isDefault: true,
    },
    {
      id: 'addr-office',
      label: 'Studio Loft',
      recipient: 'Admin User',
      phone: '+90 532 987 6543',
      lines: ['Maslak Mah. AOS 55. Street', 'No: 2 / 12'],
      city: 'Sarıyer, Istanbul',
      postalCode: '34398',
      notes: 'Deliver before 5 PM, front desk will sign.',
      isDefault: false,
    },
  ],
  preferences: {
    orderReminders: {
      label: 'Order reminders',
      description: 'Notify me when it’s time to restock essentials.',
      enabled: true,
    },
    wellnessTips: {
      label: 'Weekly wellness tips',
      description: 'Curated care tips tailored to my pets.',
      enabled: true,
    },
    earlyAccess: {
      label: 'Early access drops',
      description: 'Get notified about limited collection launches.',
      enabled: false,
    },
    smsUpdates: {
      label: 'SMS delivery updates',
      description: 'Shipping progress and delivery confirmations via SMS.',
      enabled: true,
    },
  },
  recentOrders: [],
  careNotes: [
    {
      id: 'note-loki',
      pet: 'Loki',
      type: 'Cat · 4 years old',
      text: 'Prefers grain-free food and bamboo litter. Allergic to chicken.',
    },
    {
      id: 'note-mira',
      pet: 'Mira',
      type: 'Golden Retriever · 2 years old',
      text: 'Monthly grooming on the 12th. Needs hip-friendly supplements.',
    },
  ],
  scheduled: [
    {
      id: 'sched-vet',
      title: 'Veterinary check-up',
      date: '2025-11-24',
      time: '18:30',
      location: 'Hale Veterinary Clinic, Moda',
      notes: 'Bring Loki’s vaccination booklet.',
    },
    {
      id: 'sched-grooming',
      title: 'Grooming session',
      date: '2025-12-02',
      time: '11:00',
      location: 'Pawsitive Groomers, Nişantaşı',
      notes: 'Full coat care & nail trim for Mira.',
    },
  ],
  favorites: ['Dog Treat Biscuit', 'Dog Chew Bone', 'Fur Comb'],
};

function sanitizeProfile(stored) {
  if (!stored) return DEFAULT_PROFILE;
  try {
    const parsed = JSON.parse(stored);
    // Merge but always use DEFAULT_PROFILE's favorites (to ensure latest product names)
    return { ...DEFAULT_PROFILE, ...parsed, favorites: DEFAULT_PROFILE.favorites };
  } catch (error) {
    console.warn('Corrupted profile data. Resetting to defaults.', error);
    return DEFAULT_PROFILE;
  }
}

function Profile() {
  const navigate = useNavigate();
  const mockUsers = useMemo(() => getMockUsers(), []);
  const activeMockUser = mockUsers[0] ?? DEFAULT_PROFILE;

  const [profile, setProfile] = useState(() => {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    const merged = sanitizeProfile(stored);
    return {
      ...merged,
      name: activeMockUser.name ?? merged.name,
      email: activeMockUser.email ?? merged.email,
    };
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Fetch profile from backend on mount
  useEffect(() => {
    loadProfileFromBackend();
    loadRecentOrders();
  }, []);

  const loadProfileFromBackend = async () => {
    try {
      setLoading(true);
      setError('');

      // Check if user is authenticated first
      const isAuthenticated = localStorage.getItem('is_authenticated') === 'true';
      if (!isAuthenticated) {
        // User is not logged in, skip backend call
        setLoading(false);
        return;
      }

      const response = await authAPI.getCurrentUser();
      const userData = response.data;

      if (userData) {
        const profileData = userData.profile || {};
        const fullName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.username;

        // Merge backend data with local defaults
        setProfile(prev => ({
          ...prev,
          id: String(userData.id),
          name: fullName,
          email: userData.email || prev.email,
          phone: profileData.phone || prev.phone,
          taxId: profileData.tax_id || prev.taxId || '',
          homeAddress: profileData.home_address || prev.homeAddress || '',
          bio: profileData.bio || prev.bio,
          loyaltyTier: profileData.loyalty_tier || prev.loyaltyTier || 'Standard',
          points: profileData.loyalty_points || prev.points || 0,
          petsSupported: profileData.pets_supported || prev.petsSupported || 0,
          memberSince: userData.date_joined ? new Date(userData.date_joined).toISOString().split('T')[0] : prev.memberSince,
        }));
      }
    } catch (err) {
      console.error('Failed to load profile from backend:', err);
      // Only show error if user is authenticated (otherwise it's expected)
      const isAuthenticated = localStorage.getItem('is_authenticated') === 'true';
      if (isAuthenticated) {
        // Only show error if user is logged in but backend call failed
        setError('Could not load profile from server. Using local data.');
      }
      // If not authenticated, silently use local data
    } finally {
      setLoading(false);
    }
  };

  const loadRecentOrders = async () => {
    try {
      setOrdersLoading(true);
      // Önce localStorage'dan email al (order'lar bu email ile kaydediliyor)
      const storedEmail = localStorage.getItem('user_email');
      if (!storedEmail) {
        // Eğer localStorage'da yoksa backend'den al
        try {
          const response = await authAPI.getCurrentUser();
          if (response.data && response.data.email) {
            const email = response.data.email;
            const orderResponse = await productManagerAPI.getOrderHistory(email);
            if (orderResponse.data && orderResponse.data.orders) {
              const orders = orderResponse.data.orders.slice(0, 3); // En son 3 siparişi al
              setRecentOrders(transformOrders(orders));
            }
          }
        } catch (err) {
          console.error('Failed to get user email:', err);
        }
      } else {
        const orderResponse = await productManagerAPI.getOrderHistory(storedEmail);
        if (orderResponse.data && orderResponse.data.orders) {
          const orders = orderResponse.data.orders.slice(0, 3); // En son 3 siparişi al
          setRecentOrders(transformOrders(orders));
        }
      }
    } catch (err) {
      console.error('Failed to load recent orders:', err);
      // Hata durumunda boş array bırak
      setRecentOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const transformOrders = (orders) => {
    return orders.map(order => {
      let items = [];

      if (order.items && order.items.length > 0) {
        items = order.items.map(item => ({
          name: item.product_name,
          quantity: item.quantity
        }));
      } else {
        // Fallback for legacy data
        items = [{
          name: order.product_name || 'Product details unavailable',
          quantity: order.quantity
        }];
      }

      return {
        id: order.delivery_id || order.id,
        date: order.order_date || order.date,
        status: order.status === 'processing' ? 'Processing' :
          order.status === 'in-transit' ? 'In transit' :
            order.status === 'delivered' ? 'Delivered' : order.status,
        total: parseFloat(order.total_price) || 0,
        currency: 'TRY',
        items: items,
      };
    });
  };

  const saveProfileToBackend = async (updatedFields) => {
    try {
      setSaving(true);
      await authAPI.updateProfile(updatedFields);
      await loadProfileFromBackend(); // Reload to get updated data
    } catch (err) {
      console.error('Failed to save profile to backend:', err);
      setError('Failed to save profile changes. Please try again.');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    const updatedMockUsers = mockUsers.map((user) =>
      user.id === profile.id
        ? { ...user, name: profile.name, email: profile.email }
        : user
    );
    saveMockUsers(updatedMockUsers);
  }, [profile.name, profile.email, profile.id, mockUsers]);

  const handleTogglePreference = (key) => {
    setProfile((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: {
          ...prev.preferences[key],
          enabled: !prev.preferences[key].enabled,
        },
      },
    }));
    // Note: Preferences are stored locally only for now
  };

  const handleSetDefaultAddress = (id) => {
    setProfile((prev) => ({
      ...prev,
      addresses: prev.addresses.map((address) => ({
        ...address,
        isDefault: address.id === id,
      })),
    }));
    // Note: Addresses are stored locally only for now
  };

  const handleUpdateProfile = async (field, value) => {
    const updatedProfile = { ...profile, [field]: value };
    setProfile(updatedProfile);

    // Map frontend fields to backend fields
    const backendFields = {
      phone: 'phone',
      bio: 'bio',
      loyaltyTier: 'loyalty_tier',
      points: 'loyalty_points',
      petsSupported: 'pets_supported',
    };

    if (backendFields[field]) {
      try {
        await saveProfileToBackend({ [backendFields[field]]: value });
      } catch (err) {
        // Error already handled in saveProfileToBackend
      }
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_id');
    localStorage.removeItem('is_authenticated');
    navigate('/login');
  };

  const formatDate = (value) => {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(value));
    } catch (error) {
      return value;
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {error && (
        <div style={{
          padding: '1rem',
          margin: '1rem',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          color: '#c33'
        }}>
          {error}
        </div>
      )}
      <section className="profile-hero">
        <div className="profile-identity">
          <div className="avatar-circle">
            <span role="img" aria-label="Paw print">
              🐾
            </span>
          </div>
          <div>
            <h1>{profile.name}</h1>
            <p className="profile-hero-subtitle">{profile.bio}</p>
            <div className="profile-contact-line">
              <span>{profile.email}</span>
              <span>•</span>
              <span>{profile.phone}</span>
            </div>
            {profile.taxId && (
              <div className="profile-contact-line" style={{ marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                <span>Tax ID: {profile.taxId}</span>
              </div>
            )}
            {profile.homeAddress && (
              <div className="profile-contact-line" style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                <span>Home: {profile.homeAddress}</span>
              </div>
            )}
          </div>
        </div>
        <div className="profile-badges">
          <div className="badge">
            <span className="badge-label">Membership</span>
            <span className="badge-value">{profile.loyaltyTier}</span>
            <small>Joined: {formatDate(profile.memberSince)}</small>
          </div>
          <div className="badge">
            <span className="badge-label">Loyalty points</span>
            <span className="badge-value">{profile.points.toLocaleString('en-US')}</span>
            <small>Pet Care Club</small>
          </div>
          <div className="badge">
            <span className="badge-label">Pets supported</span>
            <span className="badge-value">{profile.petsSupported}</span>
            <small>Best friend</small>
          </div>
        </div>
      </section>

      <section className="profile-grid">
        <article className="profile-card addresses-card">
          <header>
            <h2>Delivery addresses</h2>
            <p>Manage where your packages go and set your default drop point.</p>
          </header>
          <div className="address-list">
            {profile.addresses.map((address) => (
              <div
                key={address.id}
                className={`address-card ${address.isDefault ? 'is-default' : ''}`}
              >
                <div className="address-header">
                  <span className="address-label">{address.label}</span>
                  {address.isDefault && <span className="address-pill">Default</span>}
                </div>
                <p className="address-recipient">{address.recipient}</p>
                <p className="address-lines">
                  {[...address.lines, `${address.postalCode} ${address.city}`].join(', ')}
                </p>
                <p className="address-phone">{address.phone}</p>
                <p className="address-notes">{address.notes}</p>
                {!address.isDefault && (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => handleSetDefaultAddress(address.id)}
                  >
                    Set as default
                  </button>
                )}
              </div>
            ))}
          </div>
        </article>

        <article className="profile-card orders-card">
          <header>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <h2>Recent orders</h2>
              <button
                type="button"
                className="view-all-orders-button"
                onClick={() => navigate('/order-history')}
              >
                View Order History
              </button>
            </div>
          </header>
          <div className="order-list">

            {ordersLoading ? (
              <div style={{ padding: '1rem', textAlign: 'center' }}>
                Loading orders...
              </div>
            ) : recentOrders.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                No recent orders found.
              </div>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} className="order-item">
                  <div className="order-meta">
                    <span className="order-id">{order.id}</span>
                    <span className={`status-chip status-${order.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {order.status}
                    </span>
                  </div>

                  <p className="order-date">{formatDate(order.date)}</p>

                  <p className="order-total">
                    {order.total.toLocaleString('tr-TR', {
                      style: 'currency',
                      currency: order.currency,
                    })}
                  </p>

                  <ul className="order-products">
                    {order.items.map((item, index) => (
                      <li key={`${order.id}-${index}`}>
                        {item.name}
                        <span className="quantity">×{item.quantity}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="order-actions">
                    <button
                      type="button"
                      className="primary-link"
                      onClick={() => navigate('/order-history')}
                    >
                      View order
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => navigate('/products')}
                    >
                      Buy again
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="profile-card preferences-card">
          <header>
            <h2>Preferences & notifications</h2>
            <p>Fine-tune the reminders and content we prepare just for you.</p>
          </header>
          <ul className="preference-list">
            {Object.entries(profile.preferences).map(([key, preference]) => (
              <li key={key} className="preference-item">
                <div>
                  <p className="preference-label">{preference.label}</p>
                  <p className="preference-description">{preference.description}</p>
                </div>
                <button
                  type="button"
                  className={`switch ${preference.enabled ? 'is-on' : ''}`}
                  onClick={() => handleTogglePreference(key)}
                >
                  <span className="switch-handle" />
                </button>
              </li>
            ))}
          </ul>
        </article>

        <article className="profile-card care-card">
          <header>
            <h2>Care notes</h2>
            <p>Keep quick notes for your vet and groomer to stay in sync.</p>
          </header>
          <ul className="care-note-list">
            {profile.careNotes.map((note) => (
              <li key={note.id} className="care-note">
                <div className="care-note-header">
                  <span className="care-note-pet">{note.pet}</span>
                  <span className="care-note-type">{note.type}</span>
                </div>
                <p>{note.text}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className="profile-card schedule-card">
          <header>
            <h2>Upcoming appointments</h2>
            <p>Stay ahead of clinic visits and pamper sessions.</p>
          </header>
          <ul className="schedule-list">
            {profile.scheduled.map((item) => (
              <li key={item.id} className="schedule-item">
                <div>
                  <p className="schedule-date">
                    {formatDate(item.date)} · {item.time}
                  </p>
                  <p className="schedule-title">{item.title}</p>
                  <p className="schedule-location">{item.location}</p>
                </div>
                <p className="schedule-notes">{item.notes}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className="profile-card favorites-card">
          <header>
            <h2>Favorite products</h2>
            <p>Access your most-loved picks without searching.</p>
          </header>
          <div className="favorites-chip-row">
            {profile.favorites.map((favorite) => (
              <span key={favorite} className="favorite-chip">
                {favorite}
              </span>
            ))}
          </div>
        </article>
      </section>
      <section className="profile-footer">
        <button type="button" className="signout-button" onClick={handleSignOut}>
          Sign out
        </button>
      </section>
    </div>
  );
}

export default Profile;


