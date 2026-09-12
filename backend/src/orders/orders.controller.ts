import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders (public)')
@Controller('orders')
export class OrdersPublicController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a customer order / lead from the consumer portal' })
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto);
  }
}

@ApiTags('orders (admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/orders')
export class OrdersAdminController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List all orders for admin follow-up' })
  findAll() {
    return this.ordersService.findAllForAdmin();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order by ID' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOneByIdForAdmin(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update an order status' })
  updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.ordersService.updateStatus(id, body.status);
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive (soft-delete) an order' })
  archive(@Param('id') id: string) {
    return this.ordersService.archive(id);
  }

  @Delete('completed')
  @ApiOperation({ summary: 'Permanently delete all completed orders' })
  deleteCompleted() {
    return this.ordersService.removeCompleted();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an order (hard delete)' })
  delete(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
