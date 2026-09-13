import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', default: null })
  productId: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  productName: string;

  @Prop({ required: true, default: 1 })
  quantity: number;

  @Prop({ required: true, default: 0 })
  unitPrice: number;

  @Prop({ required: true, default: 0 })
  total: number;
}

@Schema({ timestamps: true, collection: 'orders' })
export class Order {
  @Prop({ required: true, trim: true })
  customerName: string;

  @Prop({ required: true, trim: true })
  mobileNumber: string;

  @Prop({ default: '', trim: true })
  whatsappNumber: string;

  @Prop({ default: '', trim: true })
  address: string;

  @Prop({ default: '', trim: true })
  source: string;

  @Prop({ default: 'pending', trim: true })
  status: string;

  @Prop({ type: [OrderItem], default: [] })
  items: OrderItem[];

  @Prop({ required: true, default: 0 })
  totalAmount: number;

  @Prop({ required: true, default: 0 })
  orderPrice: number;

  @Prop({ required: true, default: 0 })
  packagingPrice: number;
  
  @Prop({ type: Boolean, default: false })
  archived: boolean;

  @Prop({ type: Date, default: null })
  archivedAt: Date | null;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);
export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ status: 1 });
