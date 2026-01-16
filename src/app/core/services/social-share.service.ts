import { Injectable } from '@angular/core';

export interface ShareOptions {
  title: string;
  description: string;
  url: string;
  image?: string;
  hashtags?: string[];
}

/**
 * Social Share Service - Handles social media sharing
 * 
 * Features:
 * - Share to Facebook, Twitter, LinkedIn, WhatsApp
 * - Copy link to clipboard
 * - Generate share URLs for social platforms
 */
@Injectable({
  providedIn: 'root'
})
export class SocialShareService {
  private readonly BASE_URL = 'https://travelstory.app'; // Update with your actual domain

  /**
   * Share to Facebook
   */
  shareToFacebook(options: ShareOptions): void {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(options.url)}`;
    this.openShareWindow(url, 'Facebook Share');
  }

  /**
   * Share to Twitter/X
   */
  shareToTwitter(options: ShareOptions): void {
    const hashtags = options.hashtags?.join(',') || 'travel,viaggi,destinazioni';
    const text = `${options.title} - ${options.description}`.slice(0, 200);
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(options.url)}&hashtags=${hashtags}`;
    this.openShareWindow(url, 'Twitter Share');
  }

  /**
   * Share to LinkedIn
   */
  shareToLinkedIn(options: ShareOptions): void {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(options.url)}`;
    this.openShareWindow(url, 'LinkedIn Share');
  }

  /**
   * Share to WhatsApp
   */
  shareToWhatsApp(options: ShareOptions): void {
    const text = `${options.title}\n\n${options.description}\n\n${options.url}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    this.openShareWindow(url, 'WhatsApp Share');
  }

  /**
   * Share to Telegram
   */
  shareToTelegram(options: ShareOptions): void {
    const text = `${options.title}\n\n${options.description}\n\n${options.url}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(options.url)}&text=${encodeURIComponent(text)}`;
    this.openShareWindow(url, 'Telegram Share');
  }

  /**
   * Copy link to clipboard
   */
  async copyToClipboard(options: ShareOptions): Promise<boolean> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(options.url);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = options.url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textArea);
        return success;
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }

  /**
   * Share via Web Share API (native mobile share)
   */
  async shareViaNative(options: ShareOptions): Promise<boolean> {
    if (navigator.share) {
      try {
        await navigator.share({
          title: options.title,
          text: options.description,
          url: options.url
        });
        return true;
      } catch (error) {
        // User cancelled or error occurred
        return false;
      }
    }
    return false;
  }

  /**
   * Generate share URL for email
   */
  getEmailShareUrl(options: ShareOptions): string {
    const subject = encodeURIComponent(`Condivido: ${options.title}`);
    const body = encodeURIComponent(`${options.description}\n\n${options.url}`);
    return `mailto:?subject=${subject}&body=${body}`;
  }

  /**
   * Get full share URL for a city
   */
  getCityShareUrl(cityId: string): string {
    return `${this.BASE_URL}/city/${cityId}`;
  }

  /**
   * Open share window
   */
  private openShareWindow(url: string, name: string): void {
    const width = 600;
    const height = 400;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    window.open(
      url,
      name,
      `width=${width},height=${height},left=${left},top=${top},toolbar=0,menubar=0,scrollbars=1,resizable=1,location=0,status=0`
    );
  }
}
