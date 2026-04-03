import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="not-found-container">
      <h1>404</h1>
      <p>The page you are looking for does not exist.</p>
      <a routerLink="/" class="back-home">← Back to SIP Calculator</a>
    </section>
  `,
  styles: [`
    .not-found-container {
      text-align: center;
      padding: 4rem 1rem;
      max-width: 480px;
      margin: 0 auto;
    }
    h1 {
      font-size: 5rem;
      font-weight: 800;
      color: #00B386;
      margin: 0;
    }
    p {
      font-size: 1.15rem;
      color: #6c757d;
      margin: 1rem 0 2rem;
    }
    .back-home {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      background: #00B386;
      color: #fff;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
    }
    .back-home:hover { background: #009e75; }
  `]
})
export class NotFoundComponent {}
