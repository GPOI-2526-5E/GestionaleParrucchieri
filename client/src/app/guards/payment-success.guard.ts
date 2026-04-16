import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const paymentSuccessGuard: CanActivateFn = () => {
    const router = inject(Router);
    const canAccess = sessionStorage.getItem('paymentSuccessAccess') === 'true';

    if (canAccess) {
        return true;
    }

    router.navigate(['/home']);
    return false;
};
