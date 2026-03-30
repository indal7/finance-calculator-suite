import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { SeoService } from '../../../services/seo.service';

@Component({
  selector: 'app-blog-list',
  standalone: true,
  imports: [RouterLink, SlicePipe],
  templateUrl: './blog-list.html',
  styleUrls: ['./blog-list.css']
})
export class BlogListComponent implements OnInit, OnDestroy {
  private readonly seo = inject(SeoService);

  readonly posts = [
    {
      slug: 'sip-1000-per-month',
      title: '₹1,000 SIP Per Month for 5, 10, 15, 20 Years: Returns, Strategy & Planning',
      description: 'See how much ₹1,000/month SIP can grow over 5, 10, 15, and 20 years at different return assumptions. Ideal guide for beginners and students.',
      date: '2026-03-30',
      readTime: '6 min read',
      category: 'SIP Calculator'
    },
    {
      slug: '50-lakh-home-loan-emi',
      title: '₹50 Lakh Home Loan EMI in 2026: SBI, HDFC, ICICI Comparison + Savings Tips',
      description: 'Compare EMI for ₹50 lakh home loan across major banks and tenures. Learn practical ways to reduce EMI and total interest cost.',
      date: '2026-03-30',
      readTime: '7 min read',
      category: 'EMI & Loans'
    },
    {
      slug: '10-lakh-fd-interest',
      title: '₹10 Lakh FD Interest Per Month in 2026: SBI, HDFC, ICICI & Post Office Comparison',
      description: 'Bank-wise comparison of ₹10 lakh FD returns, monthly interest estimates, senior citizen rates, and tax considerations.',
      date: '2026-03-30',
      readTime: '6 min read',
      category: 'FD & Savings'
    },
    {
      slug: 'sip-vs-fd',
      title: 'SIP vs FD: Which is Better for Long-Term Wealth Creation in India?',
      description: 'Compare SIP mutual funds vs Fixed Deposits for long-term wealth creation. Understand returns, risk, liquidity, and tax implications.',
      date: '2026-01-15',
      readTime: '6 min read',
      category: 'Investment Strategy'
    },
    {
      slug: 'sip-5000-per-month',
      title: 'What Happens If You Invest ₹5,000 Per Month via SIP for 10, 20, 30 Years?',
      description: 'A detailed analysis of investing ₹5,000/month via SIP — see projected corpus at 10%, 12%, and 15% returns over different time horizons.',
      date: '2026-01-20',
      readTime: '5 min read',
      category: 'SIP Calculator'
    },
    {
      slug: 'emi-calculation-guide',
      title: 'Complete Guide to EMI Calculation in India: Formula, Examples & Tips',
      description: 'Learn how EMI is calculated for home loans, car loans and personal loans in India. Understand the formula, amortization schedule, and how to reduce your EMI.',
      date: '2026-01-25',
      readTime: '7 min read',
      category: 'EMI & Loans'
    }
  ];

  constructor() {
    this.seo.setTitle('Finance Blog – SIP, EMI, FD & Investment Tips India 2026');
    this.seo.setDescription('Expert articles on SIP investment, EMI calculation, FD returns, and wealth creation strategies for Indian investors.');
    this.seo.setKeywords([
      'sip investment guide india', 'emi calculation tips',
      'fd returns india', 'mutual fund investment india',
      'financial planning india 2026'
    ]);
    this.seo.updateOgTags(
      'Finance Blog – Investment & Calculator Guides India',
      'Expert articles on SIP, EMI, FD, CAGR and wealth creation for Indian investors.',
      'https://www.myinvestmentcalculator.in/blog'
    );
    this.seo.injectJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': 'https://www.myinvestmentcalculator.in/' },
        { '@type': 'ListItem', 'position': 2, 'name': 'Blog', 'item': 'https://www.myinvestmentcalculator.in/blog' }
      ]
    }, 'blog-list-breadcrumb');
  }

  ngOnInit(): void {
    this.seo.updateCanonical('https://www.myinvestmentcalculator.in/blog');
  }

  ngOnDestroy(): void {
    this.seo.removeJsonLd('blog-list-breadcrumb');
  }
}
