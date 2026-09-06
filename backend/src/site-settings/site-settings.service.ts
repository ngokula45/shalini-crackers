import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SiteSettings, SiteSettingsDocument } from './schemas/site-settings.schema';
import { UpdateSiteSettingsDto } from './dto/update-site-settings.dto';

@Injectable()
export class SiteSettingsService {
  constructor(
    @InjectModel(SiteSettings.name) private settingsModel: Model<SiteSettingsDocument>,
  ) {}

  // Site settings is a singleton document — there is only ever one row.
  // get() creates it with defaults on first access so the app never 404s.
  async get(): Promise<SiteSettingsDocument> {
    let settings = await this.settingsModel.findOne();
    if (!settings) {
      settings = await this.settingsModel.create({});
    }
    return settings;
  }

  async update(dto: UpdateSiteSettingsDto) {
    const settings = await this.get();
    Object.assign(settings, dto);
    return settings.save();
  }

  async getEmbedUrl(raw?: string): Promise<string | undefined> {
    const configuredUrl = (raw || '').trim();
    if (!configuredUrl || !this.isShortGoogleMapsUrl(configuredUrl)) {
      return undefined;
    }

    try {
      const response = await fetch(configuredUrl, {
        redirect: 'follow',
        signal: AbortSignal.timeout(5000),
      });
      const finalUrl = new URL(response.url);
      const placeMatch = finalUrl.pathname.match(/\/maps\/place\/([^/]+)/i);
      const latitude = finalUrl.href.match(/!3d(-?\d+(?:\.\d+)?)/)?.[1];
      const longitude = finalUrl.href.match(/!4d(-?\d+(?:\.\d+)?)/)?.[1];
      const placeName = placeMatch?.[1]?.replace(/\+/g, ' ');
      const query = [placeName, latitude, longitude].filter(Boolean).join(', ');

      return query
        ? `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`
        : undefined;
    } catch {
      return undefined;
    }
  }

  private isShortGoogleMapsUrl(value: string) {
    try {
      const url = new URL(value);
      return url.hostname === 'goo.gl'
        || url.hostname.endsWith('.goo.gl')
        || url.hostname.endsWith('.app.goo.gl');
    } catch {
      return false;
    }
  }
}
