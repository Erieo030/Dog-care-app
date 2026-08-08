import { login } from '../authService';
import { apiRequest } from '../api';

jest.mock('../api', () => ({ apiRequest: jest.fn() }));

test('login sends credentials through the shared API layer', async () => {
  (apiRequest as jest.Mock).mockResolvedValue({
    success: true,
    userId: 'u1',
    hasPet: false,
    petData: null,
  });
  await login('demo@example.com', 'password');
  expect(apiRequest).toHaveBeenCalledWith('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'demo@example.com', password: 'password' }),
  });
});
