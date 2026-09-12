import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order, OrderDocument } from './schemas/order.schema';

@Injectable()
export class OrdersService {
  constructor(@InjectModel(Order.name) private orderModel: Model<OrderDocument>) {}

  async create(dto: CreateOrderDto) {
    const totalAmount = dto.items.reduce((sum, item) => {
      const unitPrice = Number(item.unitPrice || 0);
      const quantity = Number(item.quantity || 0);
      const itemTotal = Number(item.total || unitPrice * quantity);
      return sum + itemTotal;
    }, 0);

    return this.orderModel.create({
      ...dto,
      whatsappNumber: dto.whatsappNumber || '',
      address: dto.address || '',
      source: dto.source || 'Website',
      status: 'pending',
      totalAmount,
    });
  }

  async findAllForAdmin() {
    return this.orderModel.find({ archived: { $ne: true } }).sort({ createdAt: -1 });
  }

  async findOneByIdForAdmin(id: string) {
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(id: string, status: string) {
    const allowed = ['pending', 'confirmed', 'completed'];
    const normalized = String(status || '').trim().toLowerCase();
    if (!allowed.includes(normalized)) {
      throw new NotFoundException('Invalid order status');
    }

    const order = await this.findOneByIdForAdmin(id);
    order.status = normalized;
    await order.save();
    return order;
  }

  async archive(id: string) {
    const order = await this.findOneByIdForAdmin(id);
    order.archived = true;
    order.archivedAt = new Date();
    await order.save();
    return order;
  }

  async remove(id: string) {
    const order = await this.orderModel.findByIdAndDelete(id);
    if (!order) throw new NotFoundException('Order not found');
    return { deleted: true };
  }

  async removeCompleted() {
    const result = await this.orderModel.deleteMany({ status: 'completed' });
    return { deleted: true, deletedCount: result.deletedCount };
  }
}
