const DEFAULT_USERS = [
  {
    id: '1',
    email: 'admin@petstore.com',
    password: 'admin123',
    name: 'Admin User',
  },
  {
    id: '2',
    email: 'user@example.com',
    password: 'password123',
    name: 'Test User',
  },
];

export const getMockUsers = () => {
  const stored = localStorage.getItem('mock_users');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.warn('Corrupted mock_users store. Resetting to defaults.', error);
    }
  }
  localStorage.setItem('mock_users', JSON.stringify(DEFAULT_USERS));
  return DEFAULT_USERS;
};

export const saveMockUsers = (users) => {
  localStorage.setItem('mock_users', JSON.stringify(users));
};



