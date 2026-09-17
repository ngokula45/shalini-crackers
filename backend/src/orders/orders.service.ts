import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { join } from 'path';
import PDFDocument = require('pdfkit');
import { CreateOrderDto } from './dto/create-order.dto';
import { Order, OrderDocument } from './schemas/order.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';

@Injectable()
export class OrdersService {
  private readonly minimumOrderPrice = 3000;

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async create(dto: CreateOrderDto) {
    const items = await Promise.all(dto.items.map(async (item) => {
      const product = await this.productModel.findOne({ _id: item.productId, isActive: true });
      if (!product) {
        throw new BadRequestException('One or more selected products are no longer available. Please refresh your cart.');
      }

      const unitPrice = Number(product.priceMode === 'offer' ? product.offerPrice ?? product.price : product.price);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new BadRequestException(`A valid price is not available for ${product.name}. Please refresh your cart.`);
      }
      const quantity = Number(item.quantity || 0);
      return { productId: product._id, productName: product.name, unitPrice, quantity, total: unitPrice * quantity };
    }));
    const orderPrice = items.reduce((sum, item) => sum + item.total, 0);
    if (orderPrice < this.minimumOrderPrice) {
      throw new BadRequestException(`Minimum order value is Rs. ${this.minimumOrderPrice.toLocaleString('en-IN')}.`);
    }
    const packagingPrice = Math.round(orderPrice * 0.015 * 100) / 100;
    const totalAmount = Math.round((orderPrice + packagingPrice) * 100) / 100;

    return this.orderModel.create({
      ...dto,
      items,
      whatsappNumber: dto.whatsappNumber || '',
      address: dto.address || '',
      source: dto.source || 'Website',
      status: 'pending',
      orderPrice,
      packagingPrice,
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

  async createPdf(id: string): Promise<InstanceType<typeof PDFDocument>> {
    const order = await this.findOneByIdForAdmin(id);
    const pdf = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `Shalini Crackers - Order ${order._id}` } });
    const money = (amount: number | undefined) => `Rs. ${Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const text = (value: string | undefined) => value?.trim() || 'Not provided';
    const orderPrice = order.orderPrice ?? order.totalAmount;
    const packagingPrice = order.packagingPrice ?? 0;
    const logoPath = join(__dirname, '..', 'assets', 'shalini-crackers-logo.jpg');
    const orderReference = `SC-${String(order._id).slice(-8).toUpperCase()}`;

    const pageWidth = 500;
    const left = pdf.page.margins.left;
    const divider = () => {
      const y = pdf.y + 5;
      pdf.moveTo(left, y).lineTo(left + pageWidth, y).strokeColor('#e7ded8').lineWidth(1).stroke();
      pdf.x = left;
      pdf.y = y + 15;
    };
    const sectionTitle = (title: string) => {
      pdf.x = left;
      pdf.fontSize(10).font('Helvetica-Bold').fillColor('#7a1f1f').text(title.toUpperCase());
      pdf.moveDown(0.45);
    };
    const orderDate = order.createdAt
      ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'Not available';

    pdf.rect(left, 48, pageWidth, 5).fill('#7a1f1f');
    pdf.image(logoPath, left, 62, { fit: [76, 54], align: 'center', valign: 'center' });
    pdf.fillColor('#171c35').font('Helvetica-Bold').fontSize(21).text('Shalini Crackers', left + 88, 71);
    pdf.fillColor('#6a5b55').font('Helvetica').fontSize(8).text('Mettmalai, Sivakasi - 626203', left + 88, 95);
    pdf.fontSize(7.5).text('+91 8838539912 | WhatsApp: +91 8838539912 | n.gokula45@gmail.com', left + 88, 108);
    pdf.fillColor('#7a1f1f').font('Helvetica-Bold').fontSize(9).text('ORDER SUMMARY', left + 350, 76, { width: 150, align: 'right' });
    pdf.fillColor('#6a5b55').font('Helvetica').fontSize(8).text(`Generated ${new Date().toLocaleDateString('en-IN')}`, left + 350, 94, { width: 150, align: 'right' });
    pdf.x = left;
    pdf.y = 137;
    divider();

    sectionTitle('Order details');
    pdf.fillColor('#171c35').font('Helvetica-Bold').fontSize(13).text(`Order #${orderReference}`);
    pdf.moveDown(0.15).font('Helvetica').fontSize(7.5).fillColor('#73788a').text(`Reference ID: ${order._id}`);
    pdf.moveDown(0.35).font('Helvetica').fontSize(9).fillColor('#363b4b');
    pdf.text(`Order date: ${orderDate}`);
    pdf.text(`Status: ${(order.status || 'pending').replace(/^./, (letter) => letter.toUpperCase())}`);
    pdf.text(`Source: ${text(order.source)}`);
    pdf.moveDown(0.75);
    divider();

    sectionTitle('Customer details');
    pdf.fontSize(10).font('Helvetica-Bold').fillColor('#171c35').text(text(order.customerName));
    pdf.moveDown(0.2).font('Helvetica').fontSize(9).fillColor('#363b4b');
    pdf.text(`Contact: ${text(order.mobileNumber)}`);
    pdf.text(`WhatsApp: ${text(order.whatsappNumber)}`);
    pdf.text(`Address: ${text(order.address)}`, { width: pageWidth });
    pdf.moveDown(0.75);
    divider();

    const startX = left;
    const columns = { product: startX, quantity: startX + 245, unit: startX + 315, total: startX + 410 };
    const drawTableHeader = () => {
      const y = pdf.y;
      pdf.rect(startX, y, 500, 22).fill('#f0eef9');
      pdf.fillColor('#171c35').font('Helvetica-Bold').fontSize(9);
      pdf.text('PRODUCT', columns.product + 8, y + 7, { width: 225 });
      pdf.text('QTY', columns.quantity, y + 7, { width: 55, align: 'right' });
      pdf.text('UNIT', columns.unit, y + 7, { width: 80, align: 'right' });
      pdf.text('TOTAL', columns.total, y + 7, { width: 82, align: 'right' });
      pdf.y = y + 28;
    };

    sectionTitle('Order items');
    pdf.moveDown(0.4);
    drawTableHeader();
    order.items.forEach((item) => {
      if (pdf.y > 735) {
        pdf.addPage();
        drawTableHeader();
      }
      const y = pdf.y;
      pdf.font('Helvetica').fontSize(10).fillColor('#363b4b');
      pdf.text(item.productName, columns.product + 8, y, { width: 220 });
      pdf.text(String(item.quantity), columns.quantity, y, { width: 55, align: 'right' });
      pdf.text(money(item.unitPrice), columns.unit, y, { width: 80, align: 'right' });
      pdf.text(money(item.total), columns.total, y, { width: 82, align: 'right' });
      const rowHeight = Math.max(24, pdf.heightOfString(item.productName, { width: 220 }) + 10);
      pdf.moveTo(startX, y + rowHeight).lineTo(startX + 500, y + rowHeight).strokeColor('#e4e4e4').stroke();
      pdf.y = y + rowHeight + 6;
    });

    if (pdf.y > 670) pdf.addPage();
    pdf.moveDown(0.6);
    const totalsX = startX + 280;
    const totalLine = (label: string, value: string, bold = false) => {
      const y = pdf.y;
      pdf.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 10).fillColor('#171c35');
      pdf.text(label, totalsX, y, { width: 125 });
      pdf.text(value, totalsX + 125, y, { width: 95, align: 'right' });
      pdf.y = y + 18;
    };
    totalLine('Order Price', money(orderPrice));
    totalLine('Packing Charges (1.5%)', money(packagingPrice));
    pdf.moveTo(totalsX, pdf.y).lineTo(startX + 500, pdf.y).strokeColor('#d4d4d4').stroke();
    pdf.moveDown(0.4);
    totalLine('Total Price', money(order.totalAmount), true);

    const footerY = pdf.page.height - pdf.page.margins.bottom - 14;
    pdf.moveTo(left, footerY - 8).lineTo(left + pageWidth, footerY - 8).strokeColor('#e7ded8').lineWidth(1).stroke();
    pdf.font('Helvetica').fontSize(7.5).fillColor('#73788a').text('Thank you for choosing Shalini Crackers. | +91 8838539912 | n.gokula45@gmail.com', left, footerY, { width: pageWidth, align: 'center' });
    return pdf;
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
