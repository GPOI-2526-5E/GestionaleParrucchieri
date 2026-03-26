import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

interface LoginResponse {
  token: string;
  message?: string;
  user?: {
    id: number;
    email: string;
    ruolo: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private api = 'http://localhost:3000/api/auth';

  private _token = signal<string | null>(localStorage.getItem('login_token'));

  isLoggedIn = computed(() => !!this._token());

  userRole = computed(() => {
    const token = this._token();
    if (!token) return null;

    try {
      const payloadBase64 = token.split('.')[1];
      if (!payloadBase64) return null;

      const decodedPayload = JSON.parse(atob(payloadBase64));
      return decodedPayload.ruolo ?? null;
    } catch (e) {
      console.error('Errore decodifica token', e);
      return null;
    }
  });

  isAdmin = computed(() => this.userRole() === 'admin');

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.api}/login`, {
      email,
      password,
    }).pipe(
      tap((response) => {
        if (response?.token) {
          this.saveToken(response.token);
        }
      })
    );
  }

  loginWithGoogle(): void {
    window.location.href = `${this.api}/google`;
  }

  saveToken(token: string): void {
    localStorage.setItem('login_token', token);
    this._token.set(token);
  }

  getToken(): string | null {
    return this._token();
  }

  clearToken(): void {
    localStorage.removeItem('login_token');
    this._token.set(null);
  }

  logout(): void {
    this.clearToken();
    localStorage.removeItem('rememberedEmail');
    this.router.navigate(['/login']);
  }

  get token(): string | null {
    return this._token();
  }

  register(user: {
    nome: string,
    cognome: string,
    email: string,
    password: string,
    telefono: string,
    data_nascita: string,
    ruolo: string
  }){
    return this.http.post<LoginResponse>(`${this.api}/register`, user)
    .pipe(
      tap((response) => {
        if (response?.token) {
          this.saveToken(response.token);
        }
      })
    );
  }
}
