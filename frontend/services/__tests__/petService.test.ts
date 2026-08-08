jest.mock('../api', () => ({ apiData: jest.fn() }));
import { normalizePets } from '../petService';

test('maps backend pet fields into the shared Pet type', () => {
  const [pet] = normalizePets([
    {
      _id: 'p1',
      userId: 'u1',
      name: 'Kuro',
      gender: 'male',
      breed: '柴犬',
      birthday: '2022-01-01',
      arrivalDate: '2022-02-01',
      neutered: true,
    },
  ]);
  expect(pet).toMatchObject({
    id: 'p1',
    userId: 'u1',
    name: 'Kuro',
    birthDate: '2022-01-01',
    adoptionDate: '2022-02-01',
    neutered: true,
  });
});
