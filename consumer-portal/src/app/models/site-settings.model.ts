export interface SiteSettings {
  businessName: string;
  tagline?: string;
  logoUrl?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  googleMapsUrl?: string;
  googleMapsEmbedUrl?: string;
  openingHours?: string;
  socialLinks?: { facebook?: string; instagram?: string; youtube?: string };
}
