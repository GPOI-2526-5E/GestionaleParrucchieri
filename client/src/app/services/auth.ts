import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private api = 'http://localhost:3000/api/auth';
  private _token = signal<string | null> (localStorage.getItem("geophoto_token"));
  isLoggedIn = computed(()=> !!this._token);

  constructor(private http: HttpClient, private router: Router){}

  login(email: string, password: string){
    return this.http.post<any>(`${this.api}/login`, {email, password});
  }

  saveToken(token: string){
    localStorage.setItem('geophoto_token', token);
    this._token.set(token);
  }

  logout(){
    localStorage.removeItem('geophoto_token');
    this._token.set(null);
    this.router.navigate(['/login']);
  }

  get token(){
    return this._token();
  }
}
