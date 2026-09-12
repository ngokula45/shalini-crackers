import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import slugify from 'slugify';
import { Category, CategoryDocument } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(@InjectModel(Category.name) private categoryModel: Model<CategoryDocument>) {}

  private async uniqueSlug(name: string, excludeId?: string): Promise<string> {
    const base = slugify(name, { lower: true, strict: true });
    let slug = base;
    let counter = 1;
    while (
      await this.categoryModel.findOne({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })
    ) {
      slug = `${base}-${counter++}`;
    }
    return slug;
  }

  async create(dto: CreateCategoryDto) {
    const slug = await this.uniqueSlug(dto.name);
    return this.categoryModel.create({ ...dto, slug });
  }

  async findAllForAdmin() {
    return this.categoryModel.find().sort({ sortOrder: 1, name: 1 });
  }

  async findActiveForPublic() {
    return this.categoryModel
      .find({ isActive: true })
      .select('name slug description sortOrder isActive')
      .sort({ sortOrder: 1, name: 1 })
      .lean();
  }

  async findOneBySlugPublic(slug: string) {
    const category = await this.categoryModel.findOne({ slug, isActive: true });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async findOneById(id: string) {
    const category = await this.categoryModel.findById(id);
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.findOneById(id);
    if (dto.name && dto.name !== category.name) {
      (category as any).slug = await this.uniqueSlug(dto.name, id);
    }
    Object.assign(category, dto);
    return category.save();
  }

  async remove(id: string) {
    const category = await this.findOneById(id);
    // Soft-delete only — categories are referenced by products, so a hard
    // Soft-delete only — kept for backward compatibility. Use `hardRemove`
    // when a permanent deletion is required.
    category.isActive = false;
    await category.save();
    return { deactivated: true };
  }

  async hardRemove(id: string) {
    const res = await this.categoryModel.findByIdAndDelete(id);
    if (!res) throw new NotFoundException('Category not found');
    return { removed: true };
  }

  async assertExistsAndActive(id: string) {
    const category = await this.categoryModel.findById(id);
    if (!category) throw new ConflictException('Selected category does not exist');
    return category;
  }
}
