import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private api = 'http://localhost:3000/api/auth';
  private _token = signal<string | null>(localStorage.getItem("login_token"));
  isLoggedIn = computed(() => !!this._token);

  userRole = computed(() => {
    const token = this._token();
    if (!token) return null;

    try {
      const payloadBase64 = token.split('.')[1];
      const decodedPayload = JSON.parse(atob(payloadBase64));
      return decodedPayload.ruolo; 
    } catch (e) {
      console.error("Errore decodifica token", e);
      return null;
    }
  });

  isAdmin = computed(() => this.userRole() === 'admin');

  constructor(private http: HttpClient, private router: Router) { }

  login(email: string, password: string) {
    return this.http.post<any>(`${this.api}/login`, { email, password });
  }

  saveToken(token: string) {
    localStorage.setItem('login_token', token);
    this._token.set(token);
  }

  logout() {
    localStorage.removeItem('login_token');
    this._token.set(null);
    this.router.navigate(['/login']);
  }

  get token() {
    return this._token();
  }
}
