import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from "../services/auth";


export const authInterceptor: HttpInterceptorFn = (req, next) =>{
    const auth = inject(AuthService);
    const token = auth.token;

     if (token){
        // Le richieste HttpClient sono immutabili, quindi l'header va aggiunto su una copia.
        const cloned = req.clone({
            setHeaders:{
                Authorization: `Bearer ${token}`
            }
        });
        return next(cloned);
     }

     return next(req);
}
