import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CategoriesService } from './categories.service';
import { Category } from './schemas/category.schema';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let model: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getModelToken(Category.name),
          useValue: {
            findOne: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockImplementation((doc) => Promise.resolve({ _id: '1', ...doc })),
            find: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
              }),
            }),
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    model = module.get(getModelToken(Category.name));
  });

  it('creates a category with a slugified, unique slug', async () => {
    const result = await service.create({ name: 'Sparklers & Fun' });
    expect(result.slug).toBe('sparklers-and-fun');
    expect(model.create).toHaveBeenCalled();
  });

  it('appends a counter suffix when the slug already exists', async () => {
    model.findOne.mockResolvedValueOnce({ slug: 'sparklers' }).mockResolvedValueOnce(null);
    const result = await service.create({ name: 'Sparklers' });
    expect(result.slug).toBe('sparklers-1');
  });

  it('lists only active categories for the public API', async () => {
    await service.findActiveForPublic();
    expect(model.find).toHaveBeenCalledWith({ isActive: true });
  });
});
