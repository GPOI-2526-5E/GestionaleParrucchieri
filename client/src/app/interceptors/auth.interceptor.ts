import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from "../services/auth";

/*
req => la richiesta HTTP originale
next => il gestore che trasmette la richiesta al server
*/
export const authInterceptor: HttpInterceptorFn = (req, next) =>{
    const auth = inject(AuthService);
    const token = auth.token;

     if (token){
        // le richieste http sono IMMUTIBILI
        const cloned = req.clone({
            setHeaders:{
                Authorization: `Bearer ${token}`
            }
        });
        return next(cloned);
     }

     return next(req);
}