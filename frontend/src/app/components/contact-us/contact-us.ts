import { Component, ChangeDetectionStrategy, inject, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { SeoService } from '../../services/seo.service';
import { ContactService } from '../../services/contact.service';

@Component({
  selector: 'app-contact-us',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './contact-us.html',
  styleUrls: ['./contact-us.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactUsComponent implements OnDestroy {
  private readonly seo = inject(SeoService);
  private readonly fb = inject(FormBuilder);
  private readonly contactService = inject(ContactService);

  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly errorMessage = signal('');
  openFaq: number | null = null;

  toggleFaq(index: number): void {
    this.openFaq = this.openFaq === index ? null : index;
  }

  readonly contactForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    subject: ['', [Validators.maxLength(200)]],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(5000)]],
    website: [''] // honeypot
  });

  onSubmit(): void {
    if (this.contactForm.invalid || this.submitting()) return;

    this.submitting.set(true);
    this.errorMessage.set('');

    const val = this.contactForm.getRawValue();
    this.contactService.submitContact({
      name: val.name!,
      email: val.email!,
      phone: val.phone || undefined,
      subject: val.subject || undefined,
      message: val.message!,
      website: val.website || undefined
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.submitted.set(true);
        this.contactForm.reset();
      },
      error: (err: Error) => {
        this.submitting.set(false);
        this.errorMessage.set(err.message);
      }
    });
  }

  constructor() {
    this.seo.setTitle('Contact Us – Finance Calculator India');
    this.seo.setDescription('Get in touch with Finance Calculator India. Have a question, suggestion, or feedback? Reach us by email or use our contact form. We respond within 24–48 hours.');
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/contact-us');
    this.seo.updateOgTags(
      'Contact Us – Finance Calculator India',
      'Get in touch with Finance Calculator India. Have a question, suggestion, or feedback? Reach us by email or use our contact form.',
      'https://www.myinvestmentcalculator.in/contact-us'
    );
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      'name': 'Contact Us – Finance Calculator India',
      'url': 'https://www.myinvestmentcalculator.in/contact-us',
      'description': 'Contact Finance Calculator India for queries, suggestions, or feedback.'
    }, 'contact-webpage');
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.myinvestmentcalculator.in/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'Contact Us', 'item': 'https://www.myinvestmentcalculator.in/contact-us' }
      ]
    }, 'contact-breadcrumb');
  }

  ngOnDestroy(): void {
    this.seo.removeJsonLd('contact-webpage');
    this.seo.removeJsonLd('contact-breadcrumb');
  }
}
