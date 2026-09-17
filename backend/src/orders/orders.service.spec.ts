import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { Order } from './schemas/order.schema';
import { Product } from '../products/schemas/product.schema';

describe('OrdersService', () => {
  let service: OrdersService;
  let model: { deleteMany: jest.Mock; create: jest.Mock };
  let productModel: { findOne: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getModelToken(Order.name),
          useValue: { deleteMany: jest.fn().mockResolvedValue({ deletedCount: 2 }), create: jest.fn() },
        },
        {
          provide: getModelToken(Product.name),
          useValue: { findOne: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(OrdersService);
    model = module.get(getModelToken(Order.name));
    productModel = module.get(getModelToken(Product.name));
  });

  it('permanently deletes every completed order', async () => {
    await expect(service.removeCompleted()).resolves.toEqual({ deleted: true, deletedCount: 2 });
    expect(model.deleteMany).toHaveBeenCalledWith({ status: 'completed' });
  });

  it('uses the current product price instead of client-submitted prices', async () => {
    productModel.findOne.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      name: 'Trusted product',
      price: 1000,
      offerPrice: 800,
      priceMode: 'offer',
    });
    model.create.mockImplementation((order) => order);

    const order = await service.create({
      customerName: 'Customer',
      mobileNumber: '9876543210',
      items: [{ productId: '507f1f77bcf86cd799439011', quantity: 4 }],
    });

    expect(productModel.findOne).toHaveBeenCalledWith({ _id: '507f1f77bcf86cd799439011', isActive: true });
    expect(order.items).toEqual([
      expect.objectContaining({ productName: 'Trusted product', unitPrice: 800, quantity: 4, total: 3200 }),
    ]);
    expect(order.orderPrice).toBe(3200);
  });
});
