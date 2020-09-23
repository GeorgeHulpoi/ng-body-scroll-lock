import { __spread, __decorate } from 'tslib';
import { Renderer2, Injectable, NgModule } from '@angular/core';

var NgBodyScrollLockService = /** @class */ (function () {
    function NgBodyScrollLockService(renderer) {
        this.renderer = renderer;
        this.hasPassiveEvents = false;
        this.initialClientY = -1;
        this.locks = [];
        this.documentListenerAdded = false;
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
        };
        this.locks = __spread(this.locks, [lock]);
        if (this.isIosDevice) {
            targetElement.ontouchstart = function (event) {
                if (event.targetTouches.length === 1) {
                    // detect single touch.
                    _this.initialClientY = event.targetTouches[0].clientY;
                }
            };
            targetElement.ontouchmove = function (event) {
                if (event.targetTouches.length === 1) {
                    // detect single touch.
                    _this.HandleScroll(event, targetElement);
                }
            };
            if (!this.documentListenerAdded) {
                document.addEventListener('touchmove', this.PreventDefault.bind(this), this.hasPassiveEvents ? { passive: false } : undefined);
                this.documentListenerAdded = true;
            }
        }
        else {
            this.SetOverflowHidden(options);
        }
    };
    NgBodyScrollLockService.prototype.ClearAllBodyScrollLocks = function () {
        if (this.isIosDevice) {
            // Clear all locks ontouchstart/ontouchmove handlers, and the references.
            this.locks.forEach(function (lock) {
                lock.targetElement.ontouchstart = null;
                lock.targetElement.ontouchmove = null;
            });
            if (this.documentListenerAdded) {
                // Passive argument removed because EventListenerOptions doesn't contain passive property.
                document.removeEventListener('touchmove', this.PreventDefault.bind(this));
                this.documentListenerAdded = false;
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
        this.locks = this.locks.filter(function (lock) { return lock.targetElement !== targetElement; });
        if (this.isIosDevice) {
            targetElement.ontouchstart = null;
            targetElement.ontouchmove = null;
            if (this.documentListenerAdded && this.locks.length === 0) {
                document.removeEventListener('touchmove', this.PreventDefault.bind(this));
                this.documentListenerAdded = false;
            }
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
            var passiveTestOptions = {
                get passive() {
                    this.hasPassiveEvents = true;
                    return undefined;
                }
            };
            window.addEventListener('testPassive', null, passiveTestOptions);
            // @ts-ignore
            window.removeEventListener('testPassive', null, passiveTestOptions);
        }
    };
    NgBodyScrollLockService.ctorParameters = function () { return [
        { type: Renderer2 }
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
