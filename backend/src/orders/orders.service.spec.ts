import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { Order } from './schemas/order.schema';

describe('OrdersService', () => {
  let service: OrdersService;
  let model: { deleteMany: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getModelToken(Order.name),
          useValue: { deleteMany: jest.fn().mockResolvedValue({ deletedCount: 2 }) },
        },
      ],
    }).compile();

    service = module.get(OrdersService);
    model = module.get(getModelToken(Order.name));
  });

  it('permanently deletes every completed order', async () => {
    await expect(service.removeCompleted()).resolves.toEqual({ deleted: true, deletedCount: 2 });
    expect(model.deleteMany).toHaveBeenCalledWith({ status: 'completed' });
  });
});
