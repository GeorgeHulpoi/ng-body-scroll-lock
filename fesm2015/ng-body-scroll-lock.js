import { __decorate } from 'tslib';
import { RendererFactory2, NgZone, Injectable, NgModule } from '@angular/core';
import { Observable, fromEvent } from 'rxjs';

function outsideZone(zone) {
    return (source) => {
        return new Observable(observer => {
            let sub;
            zone.runOutsideAngular(() => {
                sub = source.subscribe(observer);
            });
            return sub;
        });
    };
}
let NgBodyScrollLockService = class NgBodyScrollLockService {
    constructor(rendererFactory, ngZone) {
        this.ngZone = ngZone;
        this.hasPassiveEvents = false;
        this.initialClientY = -1;
        this.locks = [];
        this.renderer = rendererFactory.createRenderer(null, null);
        this.TestPassive();
        this.CheckIfIsIosDevice();
    }
    DisableBodyScroll(targetElement, options) {
        // targetElement must be provided
        if (!targetElement) {
            // eslint-disable-next-line no-console
            console.error('disableBodyScroll unsuccessful - targetElement must be provided when calling disableBodyScroll on IOS devices.');
            return;
        }
        // disableBodyScroll must not have been called on this targetElement before
        // tslint:disable-next-line:no-shadowed-variable
        if (this.locks.some((lock) => lock.targetElement === targetElement)) {
            return;
        }
        const lock = {
            targetElement,
            options: options || {},
            subscriptions: []
        };
        if (this.isIosDevice) {
            let subscribe;
            subscribe = fromEvent(targetElement, 'touchstart', this.hasPassiveEvents ? { passive: false } : undefined)
                .pipe(outsideZone(this.ngZone))
                .subscribe((event) => {
                if (event.targetTouches.length === 1) {
                    // detect single touch.
                    this.initialClientY = event.targetTouches[0].clientY;
                }
            });
            lock.subscriptions.push(subscribe);
            subscribe = fromEvent(targetElement, 'touchmove', this.hasPassiveEvents ? { passive: false } : undefined)
                .pipe(outsideZone(this.ngZone))
                .subscribe((event) => {
                if (event.targetTouches.length === 1) {
                    // detect single touch.
                    this.HandleScroll(event, targetElement);
                }
            });
            lock.subscriptions.push(subscribe);
            if (!this.documentListener) {
                this.documentListener = fromEvent(document, 'touchmove', this.hasPassiveEvents ? { passive: false } : undefined)
                    .pipe(outsideZone(this.ngZone))
                    .subscribe(this.PreventDefault.bind(this));
            }
        }
        this.locks.push(lock);
        if (!this.isIosDevice) {
            this.SetOverflowHidden(options);
        }
    }
    ClearAllBodyScrollLocks() {
        if (this.isIosDevice) {
            // Clear all locks ontouchstart/ontouchmove handlers, and the references.
            this.locks.forEach((lock) => {
                lock.subscriptions.forEach((s) => s.unsubscribe());
            });
            if (this.documentListener) {
                // Passive argument removed because EventListenerOptions doesn't contain passive property.
                this.documentListener.unsubscribe();
                this.documentListener = undefined;
            }
            // Reset initial clientY.
            this.initialClientY = -1;
        }
        else {
            this.RestoreOverflowSetting();
        }
        this.locks = [];
    }
    EnableBodyScroll(targetElement) {
        if (!targetElement) {
            // eslint-disable-next-line no-console
            console.error('enableBodyScroll unsuccessful - targetElement must be provided when calling enableBodyScroll on IOS devices.');
            return;
        }
        this.locks = this.locks.filter(lock => {
            if (lock.targetElement === targetElement) {
                lock.subscriptions.forEach((s) => s.unsubscribe());
                return false;
            }
            else {
                return true;
            }
        });
        if (this.isIosDevice && this.documentListener && this.locks.length === 0) {
            this.documentListener.unsubscribe();
            this.documentListener = undefined;
        }
        else if (!this.locks.length) {
            this.RestoreOverflowSetting();
        }
    }
    RestoreOverflowSetting() {
        if (this.previousBodyPaddingRight !== undefined) {
            this.renderer.setStyle(document.body, 'padding-right', this.previousBodyPaddingRight);
            // Restore previousBodyPaddingRight to undefined so setOverflowHidden knows it
            // can be set again.
            this.previousBodyPaddingRight = undefined;
        }
        if (this.previousBodyOverflowSetting !== undefined) {
            this.renderer.setStyle(document.body, 'overflow', this.previousBodyOverflowSetting);
            // Restore previousBodyOverflowSetting to undefined
            // so setOverflowHidden knows it can be set again.
            this.previousBodyOverflowSetting = undefined;
        }
    }
    SetOverflowHidden(options) {
        // If previousBodyPaddingRight is already set, don't set it again.
        if (this.previousBodyPaddingRight === undefined) {
            const reserveScrollBarGap = !!options && options.reserveScrollBarGap === true;
            const scrollBarGap = window.innerWidth - document.documentElement.clientWidth;
            if (reserveScrollBarGap && scrollBarGap > 0) {
                this.previousBodyPaddingRight = document.body.style.paddingRight;
                this.renderer.setStyle(document.body, 'padding-right', `${scrollBarGap}px`);
            }
        }
        // If previousBodyOverflowSetting is already set, don't set it again.
        if (this.previousBodyOverflowSetting === undefined) {
            this.previousBodyOverflowSetting = document.body.style.overflow;
            this.renderer.setStyle(document.body, 'overflow', 'hidden');
        }
    }
    PreventDefault(rawEvent) {
        const e = rawEvent || window.event;
        // For the case whereby consumers adds a touchmove event listener to document.
        // Recall that we do document.addEventListener('touchmove', preventDefault, { passive: false })
        // in disableBodyScroll - so if we provide this opportunity to allowTouchMove, then
        // the touchmove event on document will break.
        if (this.AllowTouchMove(e.target)) {
            return true;
        }
        // Do not prevent if the event has more than one touch (usually meaning this is a multi touch gesture like pinch to zoom).
        // @ts-ignore
        if (e.touches.length > 1) {
            return true;
        }
        if (e.preventDefault) {
            e.preventDefault();
        }
        return false;
    }
    HandleScroll(event, targetElement) {
        const clientY = event.targetTouches[0].clientY - this.initialClientY;
        if (this.AllowTouchMove(event.target)) {
            return false;
        }
        if (targetElement && targetElement.scrollTop === 0 && clientY > 0) {
            // element is at the top of its scroll.
            return this.PreventDefault(event);
        }
        if (this.isTargetElementTotallyScrolled(targetElement) && clientY < 0) {
            // element is at the bottom of its scroll.
            return this.PreventDefault(event);
        }
        event.stopPropagation();
        return true;
    }
    isTargetElementTotallyScrolled(targetElement) {
        return targetElement ? targetElement.scrollHeight - targetElement.scrollTop <= targetElement.clientHeight : false;
    }
    AllowTouchMove(el) {
        return this.locks.some(lock => {
            return lock.options.allowTouchMove && lock.options.allowTouchMove(el);
        });
    }
    CheckIfIsIosDevice() {
        this.isIosDevice = typeof window !== 'undefined' &&
            window.navigator &&
            window.navigator.platform &&
            (/iP(ad|hone|od)/.test(window.navigator.platform) ||
                (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1));
    }
    TestPassive() {
        if (typeof window !== 'undefined') {
            const passiveTestOptions = {
                get passive() {
                    this.hasPassiveEvents = true;
                    return undefined;
                }
            };
            this.ngZone.runOutsideAngular(() => {
                window.addEventListener('testPassive', null, passiveTestOptions);
                // @ts-ignore
                window.removeEventListener('testPassive', null, passiveTestOptions);
            });
        }
    }
};
NgBodyScrollLockService.ctorParameters = () => [
    { type: RendererFactory2 },
    { type: NgZone }
];
NgBodyScrollLockService = __decorate([
    Injectable()
], NgBodyScrollLockService);

let NgBodyScrollLockModule = class NgBodyScrollLockModule {
};
NgBodyScrollLockModule = __decorate([
    NgModule({
        providers: [NgBodyScrollLockService]
    })
], NgBodyScrollLockModule);

/*
 * Public API Surface of ng-body-scroll-lock
 */

/**
 * Generated bundle index. Do not edit.
 */

export { NgBodyScrollLockModule, NgBodyScrollLockService };
//# sourceMappingURL=ng-body-scroll-lock.js.map
