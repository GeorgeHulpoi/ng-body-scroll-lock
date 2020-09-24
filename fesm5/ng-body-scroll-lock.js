import { __decorate } from 'tslib';
import { RendererFactory2, NgZone, Injectable, NgModule } from '@angular/core';
import { Observable, fromEvent } from 'rxjs';

function outsideZone(zone) {
    return function (source) {
        return new Observable(function (observer) {
            var sub;
            zone.runOutsideAngular(function () {
                sub = source.subscribe(observer);
            });
            return sub;
        });
    };
}
var NgBodyScrollLockService = /** @class */ (function () {
    function NgBodyScrollLockService(rendererFactory, ngZone) {
        this.ngZone = ngZone;
        this.hasPassiveEvents = false;
        this.initialClientY = -1;
        this.locks = [];
        this.renderer = rendererFactory.createRenderer(null, null);
        this.TestPassive();
        this.CheckIfIsIosDevice();
    }
    NgBodyScrollLockService.prototype.DisableBodyScroll = function (targetElement, options) {
        var _this = this;
        // targetElement must be provided
        if (!targetElement) {
            // eslint-disable-next-line no-console
            console.error('disableBodyScroll unsuccessful - targetElement must be provided when calling disableBodyScroll on IOS devices.');
            return;
        }
        // disableBodyScroll must not have been called on this targetElement before
        // tslint:disable-next-line:no-shadowed-variable
        if (this.locks.some(function (lock) { return lock.targetElement === targetElement; })) {
            return;
        }
        var lock = {
            targetElement: targetElement,
            options: options || {},
            subscriptions: []
        };
        if (this.isIosDevice) {
            var subscribe = void 0;
            subscribe = fromEvent(targetElement, 'touchstart', this.hasPassiveEvents ? { passive: false } : undefined)
                .pipe(outsideZone(this.ngZone))
                .subscribe(function (event) {
                if (event.targetTouches.length === 1) {
                    // detect single touch.
                    _this.initialClientY = event.targetTouches[0].clientY;
                }
            });
            lock.subscriptions.push(subscribe);
            subscribe = fromEvent(targetElement, 'touchmove', this.hasPassiveEvents ? { passive: false } : undefined)
                .pipe(outsideZone(this.ngZone))
                .subscribe(function (event) {
                if (event.targetTouches.length === 1) {
                    // detect single touch.
                    _this.HandleScroll(event, targetElement);
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
    };
    NgBodyScrollLockService.prototype.ClearAllBodyScrollLocks = function () {
        if (this.isIosDevice) {
            // Clear all locks ontouchstart/ontouchmove handlers, and the references.
            this.locks.forEach(function (lock) {
                lock.subscriptions.forEach(function (s) { return s.unsubscribe(); });
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
    };
    NgBodyScrollLockService.prototype.EnableBodyScroll = function (targetElement) {
        if (!targetElement) {
            // eslint-disable-next-line no-console
            console.error('enableBodyScroll unsuccessful - targetElement must be provided when calling enableBodyScroll on IOS devices.');
            return;
        }
        this.locks = this.locks.filter(function (lock) {
            if (lock.targetElement === targetElement) {
                lock.subscriptions.forEach(function (s) { return s.unsubscribe(); });
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
    };
    NgBodyScrollLockService.prototype.RestoreOverflowSetting = function () {
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
    };
    NgBodyScrollLockService.prototype.SetOverflowHidden = function (options) {
        // If previousBodyPaddingRight is already set, don't set it again.
        if (this.previousBodyPaddingRight === undefined) {
            var reserveScrollBarGap = !!options && options.reserveScrollBarGap === true;
            var scrollBarGap = window.innerWidth - document.documentElement.clientWidth;
            if (reserveScrollBarGap && scrollBarGap > 0) {
                this.previousBodyPaddingRight = document.body.style.paddingRight;
                this.renderer.setStyle(document.body, 'padding-right', scrollBarGap + "px");
            }
        }
        // If previousBodyOverflowSetting is already set, don't set it again.
        if (this.previousBodyOverflowSetting === undefined) {
            this.previousBodyOverflowSetting = document.body.style.overflow;
            this.renderer.setStyle(document.body, 'overflow', 'hidden');
        }
    };
    NgBodyScrollLockService.prototype.PreventDefault = function (rawEvent) {
        var e = rawEvent || window.event;
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
    };
    NgBodyScrollLockService.prototype.HandleScroll = function (event, targetElement) {
        var clientY = event.targetTouches[0].clientY - this.initialClientY;
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
    };
    NgBodyScrollLockService.prototype.isTargetElementTotallyScrolled = function (targetElement) {
        return targetElement ? targetElement.scrollHeight - targetElement.scrollTop <= targetElement.clientHeight : false;
    };
    NgBodyScrollLockService.prototype.AllowTouchMove = function (el) {
        return this.locks.some(function (lock) {
            return lock.options.allowTouchMove && lock.options.allowTouchMove(el);
        });
    };
    NgBodyScrollLockService.prototype.CheckIfIsIosDevice = function () {
        this.isIosDevice = typeof window !== 'undefined' &&
            window.navigator &&
            window.navigator.platform &&
            (/iP(ad|hone|od)/.test(window.navigator.platform) ||
                (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1));
    };
    NgBodyScrollLockService.prototype.TestPassive = function () {
        if (typeof window !== 'undefined') {
            var passiveTestOptions_1 = {
                get passive() {
                    this.hasPassiveEvents = true;
                    return undefined;
                }
            };
            this.ngZone.runOutsideAngular(function () {
                window.addEventListener('testPassive', null, passiveTestOptions_1);
                // @ts-ignore
                window.removeEventListener('testPassive', null, passiveTestOptions_1);
            });
        }
    };
    NgBodyScrollLockService.ctorParameters = function () { return [
        { type: RendererFactory2 },
        { type: NgZone }
    ]; };
    NgBodyScrollLockService = __decorate([
        Injectable()
    ], NgBodyScrollLockService);
    return NgBodyScrollLockService;
}());

var NgBodyScrollLockModule = /** @class */ (function () {
    function NgBodyScrollLockModule() {
    }
    NgBodyScrollLockModule = __decorate([
        NgModule({
            providers: [NgBodyScrollLockService]
        })
    ], NgBodyScrollLockModule);
    return NgBodyScrollLockModule;
}());

/*
 * Public API Surface of ng-body-scroll-lock
 */

/**
 * Generated bundle index. Do not edit.
 */

export { NgBodyScrollLockModule, NgBodyScrollLockService };
//# sourceMappingURL=ng-body-scroll-lock.js.map
