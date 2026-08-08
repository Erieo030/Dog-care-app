import { login } from '../authService';
import { apiData } from '../api';

jest.mock('../api', () => ({ apiData: jest.fn() }));

test('login sends credentials through the shared API layer', async () => {
  (apiData as jest.Mock).mockResolvedValue({
    success: true,
    userId: 'u1',
    hasPet: false,
    petData: null,
  });
  await login('demo@example.com', 'password');
  expect(apiData).toHaveBeenCalledWith('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'demo@example.com', password: 'password' }),
  });
});
