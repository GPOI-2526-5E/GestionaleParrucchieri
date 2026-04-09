import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from "../services/auth";


export const authInterceptor: HttpInterceptorFn = (req, next) =>{
    const auth = inject(AuthService);
    const router = inject(Router);
    const token = auth.token;
    const isAuthLoginRequest = req.url.includes('/api/auth/login');

    const request = token
      ? req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        })
      : req;

    return next(request).pipe(
      catchError((error) => {
        if (error.status === 401 && token && !isAuthLoginRequest) {
          auth.clearToken();
          router.navigate(['/login']);
        }

        return throwError(() => error);
      })
    );
}
