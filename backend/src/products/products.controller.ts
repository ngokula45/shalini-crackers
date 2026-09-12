import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';

// ---------- Public routes (no auth) ----------
@ApiTags('products (public)')
@Controller('products')
export class ProductsPublicController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  @ApiOperation({ summary: 'List active products, optional ?category= and ?q= filters' })
  findAll(@Query() query: QueryProductsDto) {
    return this.productsService.findActiveForPublic(query);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get an active product by slug' })
  findOne(@Param('slug') slug: string) {
    return this.productsService.findOneBySlugPublic(slug);
  }
}

// ---------- Admin routes (JWT required) ----------
@ApiTags('products (admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/products')
export class ProductsAdminController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List all products (active + inactive)' })
  findAll() {
    return this.productsService.findAllForAdmin();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by id' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOneByIdForAdmin(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a product' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product (fields, status, sort order)' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product permanently and remove its image reference if available' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
