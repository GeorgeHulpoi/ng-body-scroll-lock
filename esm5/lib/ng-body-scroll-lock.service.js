import { __decorate } from "tslib";
import { Injectable, NgZone, Renderer2, RendererFactory2 } from '@angular/core';
import { fromEvent, Observable } from 'rxjs';
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
export { NgBodyScrollLockService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctYm9keS1zY3JvbGwtbG9jay5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6Im5nOi8vbmctYm9keS1zY3JvbGwtbG9jay8iLCJzb3VyY2VzIjpbImxpYi9uZy1ib2R5LXNjcm9sbC1sb2NrLnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxnQkFBZ0IsRUFBQyxNQUFNLGVBQWUsQ0FBQztBQUM5RSxPQUFPLEVBQUMsU0FBUyxFQUFFLFVBQVUsRUFBZSxNQUFNLE1BQU0sQ0FBQztBQWlCekQsU0FBUyxXQUFXLENBQUksSUFBWTtJQUNoQyxPQUFPLFVBQUMsTUFBcUI7UUFDekIsT0FBTyxJQUFJLFVBQVUsQ0FBQyxVQUFBLFFBQVE7WUFDMUIsSUFBSSxHQUFpQixDQUFDO1lBRXRCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztnQkFDbkIsR0FBRyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDckMsQ0FBQyxDQUFDLENBQUM7WUFFSCxPQUFPLEdBQUcsQ0FBQztRQUNmLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQyxDQUFDO0FBQ04sQ0FBQztBQUdEO0lBWUksaUNBQVksZUFBaUMsRUFBVSxNQUFjO1FBQWQsV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQVI3RCxxQkFBZ0IsR0FBRyxLQUFLLENBQUM7UUFFekIsbUJBQWMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNwQixVQUFLLEdBQVcsRUFBRSxDQUFDO1FBT3ZCLElBQUksQ0FBQyxRQUFRLEdBQUcsZUFBZSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFM0QsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ25CLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFFTSxtREFBaUIsR0FBeEIsVUFBeUIsYUFBa0IsRUFBRSxPQUEyQjtRQUF4RSxp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UUFBUTtZQUN6QixDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQztnQkFDN0MsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsS0FBSyxVQUFVLElBQUksTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvRixDQUFDO0lBRU8sNkNBQVcsR0FBbkI7UUFFSSxJQUFJLE9BQU8sTUFBTSxLQUFLLFdBQVcsRUFDakM7WUFDSSxJQUFNLG9CQUFrQixHQUNwQjtnQkFDSSxJQUFJLE9BQU87b0JBRVAsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQztvQkFDN0IsT0FBTyxTQUFTLENBQUM7Z0JBQ3JCLENBQUM7YUFDSixDQUFDO1lBRU4sSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQztnQkFDMUIsTUFBTSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsRUFBRSxJQUFJLEVBQUUsb0JBQWtCLENBQUMsQ0FBQztnQkFDakUsYUFBYTtnQkFDYixNQUFNLENBQUMsbUJBQW1CLENBQUMsYUFBYSxFQUFFLElBQUksRUFBRSxvQkFBa0IsQ0FBQyxDQUFDO1lBQ3hFLENBQUMsQ0FBQyxDQUFDO1NBQ047SUFDTCxDQUFDOztnQkFyTzRCLGdCQUFnQjtnQkFBa0IsTUFBTTs7SUFaNUQsdUJBQXVCO1FBRG5DLFVBQVUsRUFBRTtPQUNBLHVCQUF1QixDQWtQbkM7SUFBRCw4QkFBQztDQUFBLEFBbFBELElBa1BDO1NBbFBZLHVCQUF1QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7SW5qZWN0YWJsZSwgTmdab25lLCBSZW5kZXJlcjIsIFJlbmRlcmVyRmFjdG9yeTJ9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuaW1wb3J0IHtmcm9tRXZlbnQsIE9ic2VydmFibGUsIFN1YnNjcmlwdGlvbn0gZnJvbSAncnhqcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQm9keVNjcm9sbE9wdGlvbnNcbntcbiAgICByZXNlcnZlU2Nyb2xsQmFyR2FwPzogYm9vbGVhbjtcbiAgICBhbGxvd1RvdWNoTW92ZT86IChlbDogYW55KSA9PiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgTG9ja1xue1xuICAgIHRhcmdldEVsZW1lbnQ6IGFueTtcbiAgICBvcHRpb25zOiBCb2R5U2Nyb2xsT3B0aW9ucztcbiAgICBzdWJzY3JpcHRpb25zOiBTdWJzY3JpcHRpb25bXTtcbn1cblxudHlwZSBIYW5kbGVTY3JvbGxFdmVudCA9IFRvdWNoRXZlbnQ7XG5cbmZ1bmN0aW9uIG91dHNpZGVab25lPFQ+KHpvbmU6IE5nWm9uZSkge1xuICAgIHJldHVybiAoc291cmNlOiBPYnNlcnZhYmxlPFQ+KSA9PiB7XG4gICAgICAgIHJldHVybiBuZXcgT2JzZXJ2YWJsZShvYnNlcnZlciA9PiB7XG4gICAgICAgICAgICBsZXQgc3ViOiBTdWJzY3JpcHRpb247XG5cbiAgICAgICAgICAgIHpvbmUucnVuT3V0c2lkZUFuZ3VsYXIoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHN1YiA9IHNvdXJjZS5zdWJzY3JpYmUob2JzZXJ2ZXIpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHJldHVybiBzdWI7XG4gICAgICAgIH0pO1xuICAgIH07XG59XG5cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBOZ0JvZHlTY3JvbGxMb2NrU2VydmljZVxue1xuICAgIHByaXZhdGUgcmVuZGVyZXI6IFJlbmRlcmVyMjtcblxuICAgIHByaXZhdGUgaGFzUGFzc2l2ZUV2ZW50cyA9IGZhbHNlO1xuICAgIHByaXZhdGUgaXNJb3NEZXZpY2U6IGJvb2xlYW47XG4gICAgcHJpdmF0ZSBpbml0aWFsQ2xpZW50WSA9IC0xO1xuICAgIHByaXZhdGUgbG9ja3M6IExvY2tbXSA9IFtdO1xuICAgIHByaXZhdGUgZG9jdW1lbnRMaXN0ZW5lcj86IFN1YnNjcmlwdGlvbjtcbiAgICBwcml2YXRlIHByZXZpb3VzQm9keVBhZGRpbmdSaWdodDogc3RyaW5nO1xuICAgIHByaXZhdGUgcHJldmlvdXNCb2R5T3ZlcmZsb3dTZXR0aW5nOiBzdHJpbmc7XG5cbiAgICBjb25zdHJ1Y3RvcihyZW5kZXJlckZhY3Rvcnk6IFJlbmRlcmVyRmFjdG9yeTIsIHByaXZhdGUgbmdab25lOiBOZ1pvbmUpXG4gICAge1xuICAgICAgICB0aGlzLnJlbmRlcmVyID0gcmVuZGVyZXJGYWN0b3J5LmNyZWF0ZVJlbmRlcmVyKG51bGwsIG51bGwpO1xuXG4gICAgICAgIHRoaXMuVGVzdFBhc3NpdmUoKTtcbiAgICAgICAgdGhpcy5DaGVja0lmSXNJb3NEZXZpY2UoKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgRGlzYWJsZUJvZHlTY3JvbGwodGFyZ2V0RWxlbWVudDogYW55LCBvcHRpb25zPzogQm9keVNjcm9sbE9wdGlvbnMpOiB2b2lkIHtcbiAgICAgICAgLy8gdGFyZ2V0RWxlbWVudCBtdXN0IGJlIHByb3ZpZGVkXG4gICAgICAgIGlmICghdGFyZ2V0RWxlbWVudCkge1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2Rpc2FibGVCb2R5U2Nyb2xsIHVuc3VjY2Vzc2Z1bCAtIHRhcmdldEVsZW1lbnQgbXVzdCBiZSBwcm92aWRlZCB3aGVuIGNhbGxpbmcgZGlzYWJsZUJvZHlTY3JvbGwgb24gSU9TIGRldmljZXMuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBkaXNhYmxlQm9keVNjcm9sbCBtdXN0IG5vdCBoYXZlIGJlZW4gY2FsbGVkIG9uIHRoaXMgdGFyZ2V0RWxlbWVudCBiZWZvcmVcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLXNoYWRvd2VkLXZhcmlhYmxlXG4gICAgICAgIGlmICh0aGlzLmxvY2tzLnNvbWUoKGxvY2s6IExvY2spID0+IGxvY2sudGFyZ2V0RWxlbWVudCA9PT0gdGFyZ2V0RWxlbWVudCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGxvY2sgPVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHRhcmdldEVsZW1lbnQsXG4gICAgICAgICAgICAgICAgb3B0aW9uczogb3B0aW9ucyB8fCB7fSxcbiAgICAgICAgICAgICAgICBzdWJzY3JpcHRpb25zOiBbXVxuICAgICAgICAgICAgfTtcblxuICAgICAgICBpZiAodGhpcy5pc0lvc0RldmljZSkge1xuICAgICAgICAgICAgbGV0IHN1YnNjcmliZTtcblxuICAgICAgICAgICAgc3Vic2NyaWJlID0gZnJvbUV2ZW50KHRhcmdldEVsZW1lbnQsICd0b3VjaHN0YXJ0JyxcbiAgICAgICAgICAgICAgICB0aGlzLmhhc1Bhc3NpdmVFdmVudHMgPyB7IHBhc3NpdmU6IGZhbHNlIH0gOiB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgLnBpcGUob3V0c2lkZVpvbmUodGhpcy5uZ1pvbmUpKVxuICAgICAgICAgICAgICAgIC5zdWJzY3JpYmUoKGV2ZW50OiBIYW5kbGVTY3JvbGxFdmVudCkgPT4ge1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChldmVudC50YXJnZXRUb3VjaGVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZGV0ZWN0IHNpbmdsZSB0b3VjaC5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaW5pdGlhbENsaWVudFkgPSBldmVudC50YXJnZXRUb3VjaGVzWzBdLmNsaWVudFk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGxvY2suc3Vic2NyaXB0aW9ucy5wdXNoKHN1YnNjcmliZSk7XG5cbiAgICAgICAgICAgIHN1YnNjcmliZSA9IGZyb21FdmVudCh0YXJnZXRFbGVtZW50LCAndG91Y2htb3ZlJyxcbiAgICAgICAgICAgICAgICB0aGlzLmhhc1Bhc3NpdmVFdmVudHMgPyB7IHBhc3NpdmU6IGZhbHNlIH0gOiB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgLnBpcGUob3V0c2lkZVpvbmUodGhpcy5uZ1pvbmUpKVxuICAgICAgICAgICAgICAgIC5zdWJzY3JpYmUoKGV2ZW50OiBIYW5kbGVTY3JvbGxFdmVudCkgPT4ge1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChldmVudC50YXJnZXRUb3VjaGVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZGV0ZWN0IHNpbmdsZSB0b3VjaC5cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuSGFuZGxlU2Nyb2xsKGV2ZW50LCB0YXJnZXRFbGVtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgbG9jay5zdWJzY3JpcHRpb25zLnB1c2goc3Vic2NyaWJlKTtcblxuICAgICAgICAgICAgaWYgKCF0aGlzLmRvY3VtZW50TGlzdGVuZXIpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmRvY3VtZW50TGlzdGVuZXIgPSBmcm9tRXZlbnQoZG9jdW1lbnQsICd0b3VjaG1vdmUnLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmhhc1Bhc3NpdmVFdmVudHMgPyB7IHBhc3NpdmU6IGZhbHNlIH0gOiB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgICAgIC5waXBlKG91dHNpZGVab25lKHRoaXMubmdab25lKSlcbiAgICAgICAgICAgICAgICAgICAgLnN1YnNjcmliZSh0aGlzLlByZXZlbnREZWZhdWx0LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5sb2Nrcy5wdXNoKGxvY2spO1xuXG4gICAgICAgIGlmICghdGhpcy5pc0lvc0RldmljZSkge1xuICAgICAgICAgICAgdGhpcy5TZXRPdmVyZmxvd0hpZGRlbihvcHRpb25zKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHB1YmxpYyBDbGVhckFsbEJvZHlTY3JvbGxMb2NrcygpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMuaXNJb3NEZXZpY2UpIHtcbiAgICAgICAgICAgIC8vIENsZWFyIGFsbCBsb2NrcyBvbnRvdWNoc3RhcnQvb250b3VjaG1vdmUgaGFuZGxlcnMsIGFuZCB0aGUgcmVmZXJlbmNlcy5cbiAgICAgICAgICAgIHRoaXMubG9ja3MuZm9yRWFjaCgobG9jazogTG9jaykgPT4ge1xuICAgICAgICAgICAgICAgIGxvY2suc3Vic2NyaXB0aW9ucy5mb3JFYWNoKChzOiBTdWJzY3JpcHRpb24pID0+IHMudW5zdWJzY3JpYmUoKSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuZG9jdW1lbnRMaXN0ZW5lcikge1xuICAgICAgICAgICAgICAgIC8vIFBhc3NpdmUgYXJndW1lbnQgcmVtb3ZlZCBiZWNhdXNlIEV2ZW50TGlzdGVuZXJPcHRpb25zIGRvZXNuJ3QgY29udGFpbiBwYXNzaXZlIHByb3BlcnR5LlxuICAgICAgICAgICAgICAgIHRoaXMuZG9jdW1lbnRMaXN0ZW5lci51bnN1YnNjcmliZSgpO1xuICAgICAgICAgICAgICAgIHRoaXMuZG9jdW1lbnRMaXN0ZW5lciA9IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFJlc2V0IGluaXRpYWwgY2xpZW50WS5cbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbENsaWVudFkgPSAtMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuUmVzdG9yZU92ZXJmbG93U2V0dGluZygpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5sb2NrcyA9IFtdO1xuICAgIH1cblxuICAgIHB1YmxpYyBFbmFibGVCb2R5U2Nyb2xsKHRhcmdldEVsZW1lbnQ6IGFueSk6IHZvaWQge1xuICAgICAgICBpZiAoIXRhcmdldEVsZW1lbnQpIHtcbiAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdlbmFibGVCb2R5U2Nyb2xsIHVuc3VjY2Vzc2Z1bCAtIHRhcmdldEVsZW1lbnQgbXVzdCBiZSBwcm92aWRlZCB3aGVuIGNhbGxpbmcgZW5hYmxlQm9keVNjcm9sbCBvbiBJT1MgZGV2aWNlcy4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMubG9ja3MgPSB0aGlzLmxvY2tzLmZpbHRlcihsb2NrID0+IHtcbiAgICAgICAgICAgIGlmIChsb2NrLnRhcmdldEVsZW1lbnQgPT09IHRhcmdldEVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBsb2NrLnN1YnNjcmlwdGlvbnMuZm9yRWFjaCgoczogU3Vic2NyaXB0aW9uKSA9PiBzLnVuc3Vic2NyaWJlKCkpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSB7IHJldHVybiB0cnVlOyB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmICh0aGlzLmlzSW9zRGV2aWNlICYmIHRoaXMuZG9jdW1lbnRMaXN0ZW5lciAmJiB0aGlzLmxvY2tzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy5kb2N1bWVudExpc3RlbmVyLnVuc3Vic2NyaWJlKCk7XG4gICAgICAgICAgICB0aGlzLmRvY3VtZW50TGlzdGVuZXIgPSB1bmRlZmluZWQ7XG5cbiAgICAgICAgfSBlbHNlIGlmICghdGhpcy5sb2Nrcy5sZW5ndGgpIHtcbiAgICAgICAgICAgIHRoaXMuUmVzdG9yZU92ZXJmbG93U2V0dGluZygpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBSZXN0b3JlT3ZlcmZsb3dTZXR0aW5nKCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5wcmV2aW91c0JvZHlQYWRkaW5nUmlnaHQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRTdHlsZShkb2N1bWVudC5ib2R5LCAncGFkZGluZy1yaWdodCcsIHRoaXMucHJldmlvdXNCb2R5UGFkZGluZ1JpZ2h0KTtcblxuICAgICAgICAgICAgLy8gUmVzdG9yZSBwcmV2aW91c0JvZHlQYWRkaW5nUmlnaHQgdG8gdW5kZWZpbmVkIHNvIHNldE92ZXJmbG93SGlkZGVuIGtub3dzIGl0XG4gICAgICAgICAgICAvLyBjYW4gYmUgc2V0IGFnYWluLlxuICAgICAgICAgICAgdGhpcy5wcmV2aW91c0JvZHlQYWRkaW5nUmlnaHQgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5wcmV2aW91c0JvZHlPdmVyZmxvd1NldHRpbmcgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRTdHlsZShkb2N1bWVudC5ib2R5LCAnb3ZlcmZsb3cnLCB0aGlzLnByZXZpb3VzQm9keU92ZXJmbG93U2V0dGluZyk7XG5cbiAgICAgICAgICAgIC8vIFJlc3RvcmUgcHJldmlvdXNCb2R5T3ZlcmZsb3dTZXR0aW5nIHRvIHVuZGVmaW5lZFxuICAgICAgICAgICAgLy8gc28gc2V0T3ZlcmZsb3dIaWRkZW4ga25vd3MgaXQgY2FuIGJlIHNldCBhZ2Fpbi5cbiAgICAgICAgICAgIHRoaXMucHJldmlvdXNCb2R5T3ZlcmZsb3dTZXR0aW5nID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBTZXRPdmVyZmxvd0hpZGRlbihvcHRpb25zPzogQm9keVNjcm9sbE9wdGlvbnMpOiB2b2lkIHtcbiAgICAgICAgLy8gSWYgcHJldmlvdXNCb2R5UGFkZGluZ1JpZ2h0IGlzIGFscmVhZHkgc2V0LCBkb24ndCBzZXQgaXQgYWdhaW4uXG4gICAgICAgIGlmICh0aGlzLnByZXZpb3VzQm9keVBhZGRpbmdSaWdodCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25zdCByZXNlcnZlU2Nyb2xsQmFyR2FwID0gISFvcHRpb25zICYmIG9wdGlvbnMucmVzZXJ2ZVNjcm9sbEJhckdhcCA9PT0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbnN0IHNjcm9sbEJhckdhcCA9IHdpbmRvdy5pbm5lcldpZHRoIC0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoO1xuXG4gICAgICAgICAgICBpZiAocmVzZXJ2ZVNjcm9sbEJhckdhcCAmJiBzY3JvbGxCYXJHYXAgPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmV2aW91c0JvZHlQYWRkaW5nUmlnaHQgPSBkb2N1bWVudC5ib2R5LnN0eWxlLnBhZGRpbmdSaWdodDtcbiAgICAgICAgICAgICAgICB0aGlzLnJlbmRlcmVyLnNldFN0eWxlKGRvY3VtZW50LmJvZHksICdwYWRkaW5nLXJpZ2h0JywgYCR7c2Nyb2xsQmFyR2FwfXB4YCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWYgcHJldmlvdXNCb2R5T3ZlcmZsb3dTZXR0aW5nIGlzIGFscmVhZHkgc2V0LCBkb24ndCBzZXQgaXQgYWdhaW4uXG4gICAgICAgIGlmICh0aGlzLnByZXZpb3VzQm9keU92ZXJmbG93U2V0dGluZyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLnByZXZpb3VzQm9keU92ZXJmbG93U2V0dGluZyA9IGRvY3VtZW50LmJvZHkuc3R5bGUub3ZlcmZsb3c7XG4gICAgICAgICAgICB0aGlzLnJlbmRlcmVyLnNldFN0eWxlKGRvY3VtZW50LmJvZHksICdvdmVyZmxvdycsICdoaWRkZW4nKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgUHJldmVudERlZmF1bHQocmF3RXZlbnQ6IEhhbmRsZVNjcm9sbEV2ZW50KTogYm9vbGVhbiB7XG4gICAgICAgIGNvbnN0IGUgPSByYXdFdmVudCB8fCB3aW5kb3cuZXZlbnQ7XG5cbiAgICAgICAgLy8gRm9yIHRoZSBjYXNlIHdoZXJlYnkgY29uc3VtZXJzIGFkZHMgYSB0b3VjaG1vdmUgZXZlbnQgbGlzdGVuZXIgdG8gZG9jdW1lbnQuXG4gICAgICAgIC8vIFJlY2FsbCB0aGF0IHdlIGRvIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIHByZXZlbnREZWZhdWx0LCB7IHBhc3NpdmU6IGZhbHNlIH0pXG4gICAgICAgIC8vIGluIGRpc2FibGVCb2R5U2Nyb2xsIC0gc28gaWYgd2UgcHJvdmlkZSB0aGlzIG9wcG9ydHVuaXR5IHRvIGFsbG93VG91Y2hNb3ZlLCB0aGVuXG4gICAgICAgIC8vIHRoZSB0b3VjaG1vdmUgZXZlbnQgb24gZG9jdW1lbnQgd2lsbCBicmVhay5cbiAgICAgICAgaWYgKHRoaXMuQWxsb3dUb3VjaE1vdmUoZS50YXJnZXQpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBEbyBub3QgcHJldmVudCBpZiB0aGUgZXZlbnQgaGFzIG1vcmUgdGhhbiBvbmUgdG91Y2ggKHVzdWFsbHkgbWVhbmluZyB0aGlzIGlzIGEgbXVsdGkgdG91Y2ggZ2VzdHVyZSBsaWtlIHBpbmNoIHRvIHpvb20pLlxuICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgIGlmIChlLnRvdWNoZXMubGVuZ3RoID4gMSkgeyByZXR1cm4gdHJ1ZTsgfVxuXG4gICAgICAgIGlmIChlLnByZXZlbnREZWZhdWx0KSB7IGUucHJldmVudERlZmF1bHQoKTsgfVxuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBwcml2YXRlIEhhbmRsZVNjcm9sbChldmVudDogSGFuZGxlU2Nyb2xsRXZlbnQsIHRhcmdldEVsZW1lbnQ6IGFueSk6IGFueVxuICAgIHtcbiAgICAgICAgY29uc3QgY2xpZW50WSA9IGV2ZW50LnRhcmdldFRvdWNoZXNbMF0uY2xpZW50WSAtIHRoaXMuaW5pdGlhbENsaWVudFk7XG5cbiAgICAgICAgaWYgKHRoaXMuQWxsb3dUb3VjaE1vdmUoZXZlbnQudGFyZ2V0KSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRhcmdldEVsZW1lbnQgJiYgdGFyZ2V0RWxlbWVudC5zY3JvbGxUb3AgPT09IDAgJiYgY2xpZW50WSA+IDApIHtcbiAgICAgICAgICAgIC8vIGVsZW1lbnQgaXMgYXQgdGhlIHRvcCBvZiBpdHMgc2Nyb2xsLlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuUHJldmVudERlZmF1bHQoZXZlbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuaXNUYXJnZXRFbGVtZW50VG90YWxseVNjcm9sbGVkKHRhcmdldEVsZW1lbnQpICYmIGNsaWVudFkgPCAwKSB7XG4gICAgICAgICAgICAvLyBlbGVtZW50IGlzIGF0IHRoZSBib3R0b20gb2YgaXRzIHNjcm9sbC5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLlByZXZlbnREZWZhdWx0KGV2ZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBwcml2YXRlIGlzVGFyZ2V0RWxlbWVudFRvdGFsbHlTY3JvbGxlZCh0YXJnZXRFbGVtZW50OiBhbnkpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRhcmdldEVsZW1lbnQgPyB0YXJnZXRFbGVtZW50LnNjcm9sbEhlaWdodCAtIHRhcmdldEVsZW1lbnQuc2Nyb2xsVG9wIDw9IHRhcmdldEVsZW1lbnQuY2xpZW50SGVpZ2h0IDogZmFsc2U7XG4gICAgfVxuICAgIHByaXZhdGUgQWxsb3dUb3VjaE1vdmUoZWw6IEV2ZW50VGFyZ2V0KTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0aGlzLmxvY2tzLnNvbWUobG9jayA9PiB7XG4gICAgICAgICAgICByZXR1cm4gbG9jay5vcHRpb25zLmFsbG93VG91Y2hNb3ZlICYmIGxvY2sub3B0aW9ucy5hbGxvd1RvdWNoTW92ZShlbCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHByaXZhdGUgQ2hlY2tJZklzSW9zRGV2aWNlKCk6IHZvaWRcbiAgICB7XG4gICAgICAgIHRoaXMuaXNJb3NEZXZpY2UgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgICAgICAgd2luZG93Lm5hdmlnYXRvciAmJlxuICAgICAgICAgICAgd2luZG93Lm5hdmlnYXRvci5wbGF0Zm9ybSAmJlxuICAgICAgICAgICAgKC9pUChhZHxob25lfG9kKS8udGVzdCh3aW5kb3cubmF2aWdhdG9yLnBsYXRmb3JtKSB8fFxuICAgICAgICAgICAgICAgICh3aW5kb3cubmF2aWdhdG9yLnBsYXRmb3JtID09PSAnTWFjSW50ZWwnICYmIHdpbmRvdy5uYXZpZ2F0b3IubWF4VG91Y2hQb2ludHMgPiAxKSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBUZXN0UGFzc2l2ZSgpOiB2b2lkXG4gICAge1xuICAgICAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgICAgIHtcbiAgICAgICAgICAgIGNvbnN0IHBhc3NpdmVUZXN0T3B0aW9ucyA9XG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICBnZXQgcGFzc2l2ZSgpXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFzUGFzc2l2ZUV2ZW50cyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdGhpcy5uZ1pvbmUucnVuT3V0c2lkZUFuZ3VsYXIoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0ZXN0UGFzc2l2ZScsIG51bGwsIHBhc3NpdmVUZXN0T3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCd0ZXN0UGFzc2l2ZScsIG51bGwsIHBhc3NpdmVUZXN0T3B0aW9ucyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiJdfQ==