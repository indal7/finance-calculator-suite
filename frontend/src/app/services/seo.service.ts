import { inject, Injectable } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title    = inject(Title);
  private readonly meta     = inject(Meta);
  private readonly document = inject(DOCUMENT);

  setTitle(title: string): void {
    this.title.setTitle(title);
  }

  setDescription(desc: string): void {
    this.meta.updateTag({ name: 'description', content: desc });
  }

  updateCanonical(url: string): void {
    const head = this.document?.head;
    if (!head) return;
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  updateOgTags(title: string, desc: string, url: string, image?: string): void {
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: desc });
    this.meta.updateTag({ property: 'og:url', content: url });
    if (image) {
      this.meta.updateTag({ property: 'og:image', content: image });
      this.meta.updateTag({ name: 'twitter:image', content: image });
    }
  }

  /**
   * Injects a JSON-LD structured data script into the document head.
   * Uses a unique id so calling this multiple times with the same id replaces
   * the previous script (useful for SPA navigation).
   */
  injectJsonLd(schema: object, id: string): void {
    const head = this.document?.head;
    if (!head) return;
    let script = head.querySelector<HTMLScriptElement>(`script[type="application/ld+json"][data-schema-id="${id}"]`);
    if (!script) {
      script = this.document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('data-schema-id', id);
      head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema);
  }

  /** Removes a previously injected JSON-LD script by its id. */
  removeJsonLd(id: string): void {
    const head = this.document?.head;
    if (!head) return;
    const script = head.querySelector<HTMLScriptElement>(`script[type="application/ld+json"][data-schema-id="${id}"]`);
    script?.remove();
  }

  /**
   * Injects (or replaces) a FAQPage JSON-LD schema into the document head.
   * Calling this on route change automatically removes the previous FAQ schema
   * because it reuses the fixed id 'faq-schema', ensuring only ONE FAQPage
   * schema exists at any time.
   */
  updateFAQSchema(faqs: { question: string; answer: string }[]): void {
    this.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': faqs.map(faq => ({
        '@type': 'Question',
        'name': faq.question,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': faq.answer
        }
      }))
    }, 'faq-schema');
  }

  /** Removes the active FAQPage schema (call on component destroy). */
  removeFAQSchema(): void {
    this.removeJsonLd('faq-schema');
  }
}
