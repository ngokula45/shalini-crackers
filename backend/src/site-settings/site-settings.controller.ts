import { Body, Controller, Get, Header, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SiteSettingsService } from './site-settings.service';
import { UpdateSiteSettingsDto } from './dto/update-site-settings.dto';

@ApiTags('site-settings (public)')
@Controller('site-settings')
export class SiteSettingsPublicController {
  constructor(private settingsService: SiteSettingsService) {}

  @Get('public')
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=300')
  @ApiOperation({ summary: 'Get public business/contact information' })
  async getPublic() {
    const settings = await this.settingsService.get();
    return {
      ...settings.toObject(),
      googleMapsEmbedUrl: await this.settingsService.getEmbedUrl(settings.googleMapsUrl),
    };
  }
}

@ApiTags('site-settings (admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/site-settings')
export class SiteSettingsAdminController {
  constructor(private settingsService: SiteSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get site settings (admin view)' })
  get() {
    return this.settingsService.get();
  }

  @Patch()
  @ApiOperation({ summary: 'Update site settings' })
  update(@Body() dto: UpdateSiteSettingsDto) {
    return this.settingsService.update(dto);
  }
}
