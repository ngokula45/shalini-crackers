import { Body, Controller, Delete, Get, Header, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

// ---------- Public routes (no auth) ----------
@ApiTags('categories (public)')
@Controller('categories')
export class CategoriesPublicController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  @ApiOperation({ summary: 'List active categories' })
  findAll() {
    return this.categoriesService.findActiveForPublic();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get an active category by slug' })
  findOne(@Param('slug') slug: string) {
    return this.categoriesService.findOneBySlugPublic(slug);
  }
}

// ---------- Admin routes (JWT required) ----------
@ApiTags('categories (admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/categories')
export class CategoriesAdminController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all categories (active + inactive)' })
  findAll() {
    return this.categoriesService.findAllForAdmin();
  }

  @Post()
  @ApiOperation({ summary: 'Create a category' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update / activate / deactivate / reorder a category' })
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a category (soft delete)' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }

  @Delete(':id/hard')
  @ApiOperation({ summary: 'Hard delete a category (permanent)' })
  hardRemove(@Param('id') id: string) {
    return this.categoriesService.hardRemove(id);
  }
}
