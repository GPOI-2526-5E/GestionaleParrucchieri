import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { ChatUiService } from '../../services/chat-ui';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {
  isScrolled = false;

  private chatUi = inject(ChatUiService);
  private router = inject(Router);
  private auth = inject(AuthService);

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 50;
  }

  openAi() {
    this.chatUi.open('navbar');
  }

  rememberLoginOrigin(): void {
    const currentUrl = this.router.url;

    if (currentUrl && currentUrl !== '/login') {
      localStorage.setItem('loginBackUrl', currentUrl);
    }
  }

  scrollToFragment(fragment: string) {
    const isHome = this.router.url == '/' || this.router.url.startsWith('/#');

    if (isHome) {
      const el = document.getElementById(fragment);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      this.router.navigate(['/'], { fragment }).then(() => {
        setTimeout(() => {
          const el = document.getElementById(fragment);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
      });
    }
  }

  isUserPage(): boolean {
    return this.router.url === '/login' || this.router.url === '/account';
  }

  get isManagementUser(): boolean {
    return this.auth.isOperatore();
  }
}
