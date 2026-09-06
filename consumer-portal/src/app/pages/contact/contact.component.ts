import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ApiService } from '../../services/api.service';
import { SiteSettings } from '../../models/site-settings.model';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contact.component.html',
})
export class ContactComponent implements OnInit {
  private api = inject(ApiService);
  private sanitizer = inject(DomSanitizer);
  settings: SiteSettings | null = null;
  embedUrl: SafeResourceUrl | null = null;

  ngOnInit() {
    this.api.getSiteSettings().subscribe({ next: (s) => { this.settings = s; this.setEmbedUrl(); } });
  }
  private computeMapsUrl(raw?: string, address?: string): string {
    const configuredUrl = (raw || '').trim();
    const searchTarget = (address || 'store location').trim();

    if (configuredUrl) {
      try {
        const mapUrl = new URL(configuredUrl);
        const isGoogleMapsUrl = mapUrl.hostname === 'google.com'
          || mapUrl.hostname.endsWith('.google.com')
          || mapUrl.hostname === 'goo.gl'
          || mapUrl.hostname.endsWith('.goo.gl')
          || mapUrl.hostname.endsWith('.app.goo.gl');

        if (isGoogleMapsUrl) {
          mapUrl.searchParams.set('output', 'embed');
          return mapUrl.toString();
        }
      } catch {
        // Fall back to the configured text below when the value is not a URL.
      }
    }

    const target = configuredUrl || searchTarget;
    return `https://www.google.com/maps?q=${encodeURIComponent(target)}&output=embed&z=15`;
  }

  private setEmbedUrl() {
    const url = this.computeMapsUrl(
      this.settings?.googleMapsEmbedUrl || this.settings?.googleMapsUrl,
      this.settings?.address,
    );
    this.embedUrl = url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  }
}
