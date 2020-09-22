import { __decorate, __read, __spread } from "tslib";
import { Injectable } from '@angular/core';
var NgBodyScrollLockService = /** @class */ (function () {
    function NgBodyScrollLockService() {
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
            document.body.style.paddingRight = this.previousBodyPaddingRight;
            // Restore previousBodyPaddingRight to undefined so setOverflowHidden knows it
            // can be set again.
            this.previousBodyPaddingRight = undefined;
        }
        if (this.previousBodyOverflowSetting !== undefined) {
            document.body.style.overflow = this.previousBodyOverflowSetting;
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
                document.body.style.paddingRight = scrollBarGap + "px";
            }
        }
        // If previousBodyOverflowSetting is already set, don't set it again.
        if (this.previousBodyOverflowSetting === undefined) {
            this.previousBodyOverflowSetting = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
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
    NgBodyScrollLockService = __decorate([
        Injectable()
    ], NgBodyScrollLockService);
    return NgBodyScrollLockService;
}());
export { NgBodyScrollLockService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctYm9keS1zY3JvbGwtbG9jay5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6Im5nOi8vbmctYm9keS1zY3JvbGwtbG9jay8iLCJzb3VyY2VzIjpbImxpYi9uZy1ib2R5LXNjcm9sbC1sb2NrLnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFpQjNDO0lBVUk7UUFSUSxxQkFBZ0IsR0FBRyxLQUFLLENBQUM7UUFFekIsbUJBQWMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNwQixVQUFLLEdBQVcsRUFBRSxDQUFDO1FBQ25CLDBCQUFxQixHQUFHLEtBQUssQ0FBQztRQU1sQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDbkIsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUVNLG1EQUFpQixHQUF4QixVQUF5QixhQUFrQixFQUFFLE9BQTJCO1FBQXhFLGlCQTZDQztRQTVDRyxpQ0FBaUM7UUFDakMsSUFBSSxDQUFDLGFBQWEsRUFBRTtZQUNoQixzQ0FBc0M7WUFDdEMsT0FBTyxDQUFDLEtBQUssQ0FBQyxnSEFBZ0gsQ0FBQyxDQUFDO1lBQ2hJLE9BQU87U0FDVjtRQUVELDJFQUEyRTtRQUMzRSxnREFBZ0Q7UUFDaEQsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFDLElBQVUsSUFBSyxPQUFBLElBQUksQ0FBQyxhQUFhLEtBQUssYUFBYSxFQUFwQyxDQUFvQyxDQUFDLEVBQUU7WUFDdkUsT0FBTztTQUNWO1FBRUQsSUFBTSxJQUFJLEdBQ1Y7WUFDSSxhQUFhLGVBQUE7WUFDYixPQUFPLEVBQUUsT0FBTyxJQUFJLEVBQUU7U0FDekIsQ0FBQztRQUVGLElBQUksQ0FBQyxLQUFLLFlBQU8sSUFBSSxDQUFDLEtBQUssR0FBRSxJQUFJLEVBQUMsQ0FBQztRQUVuQyxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUU7WUFDbEIsYUFBYSxD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LElBQUksT0FBTyxNQUFNLEtBQUssV0FBVyxFQUNqQztZQUNJLElBQU0sa0JBQWtCLEdBQ3hCO2dCQUNJLElBQUksT0FBTztvQkFFUCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO29CQUM3QixPQUFPLFNBQVMsQ0FBQztnQkFDckIsQ0FBQzthQUNKLENBQUM7WUFDRixNQUFNLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxFQUFFLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1lBQ2pFLGFBQWE7WUFDYixNQUFNLENBQUMsbUJBQW1CLENBQUMsYUFBYSxFQUFFLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1NBQ3ZFO0lBQ0wsQ0FBQztJQTFOUSx1QkFBdUI7UUFEbkMsVUFBVSxFQUFFO09BQ0EsdUJBQXVCLENBMk5uQztJQUFELDhCQUFDO0NBQUEsQUEzTkQsSUEyTkM7U0EzTlksdUJBQXVCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgSW5qZWN0YWJsZSB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEJvZHlTY3JvbGxPcHRpb25zXG57XG4gICAgcmVzZXJ2ZVNjcm9sbEJhckdhcD86IGJvb2xlYW47XG4gICAgYWxsb3dUb3VjaE1vdmU/OiAoZWw6IGFueSkgPT4gYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIExvY2tcbntcbiAgICB0YXJnZXRFbGVtZW50OiBhbnk7XG4gICAgb3B0aW9uczogQm9keVNjcm9sbE9wdGlvbnM7XG59XG5cbnR5cGUgSGFuZGxlU2Nyb2xsRXZlbnQgPSBUb3VjaEV2ZW50O1xuXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgTmdCb2R5U2Nyb2xsTG9ja1NlcnZpY2VcbntcbiAgICBwcml2YXRlIGhhc1Bhc3NpdmVFdmVudHMgPSBmYWxzZTtcbiAgICBwcml2YXRlIGlzSW9zRGV2aWNlOiBib29sZWFuO1xuICAgIHByaXZhdGUgaW5pdGlhbENsaWVudFkgPSAtMTtcbiAgICBwcml2YXRlIGxvY2tzOiBMb2NrW10gPSBbXTtcbiAgICBwcml2YXRlIGRvY3VtZW50TGlzdGVuZXJBZGRlZCA9IGZhbHNlO1xuICAgIHByaXZhdGUgcHJldmlvdXNCb2R5UGFkZGluZ1JpZ2h0OiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBwcmV2aW91c0JvZHlPdmVyZmxvd1NldHRpbmc6IHN0cmluZztcblxuICAgIGNvbnN0cnVjdG9yKClcbiAgICB7XG4gICAgICAgIHRoaXMuVGVzdFBhc3NpdmUoKTtcbiAgICAgICAgdGhpcy5DaGVja0lmSXNJb3NEZXZpY2UoKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgRGlzYWJsZUJvZHlTY3JvbGwodGFyZ2V0RWxlbWVudDogYW55LCBvcHRpb25zPzogQm9keVNjcm9sbE9wdGlvbnMpOiB2b2lkIHtcbiAgICAgICAgLy8gdGFyZ2V0RWxlbWVudCBtdXN0IGJlIHByb3ZpZGVkXG4gICAgICAgIGlmICghdGFyZ2V0RWxlbWVudCkge1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2Rpc2FibGVCb2R5U2Nyb2xsIHVuc3VjY2Vzc2Z1bCAtIHRhcmdldEVsZW1lbnQgbXVzdCBiZSBwcm92aWRlZCB3aGVuIGNhbGxpbmcgZGlzYWJsZUJvZHlTY3JvbGwgb24gSU9TIGRldmljZXMuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBkaXNhYmxlQm9keVNjcm9sbCBtdXN0IG5vdCBoYXZlIGJlZW4gY2FsbGVkIG9uIHRoaXMgdGFyZ2V0RWxlbWVudCBiZWZvcmVcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLXNoYWRvd2VkLXZhcmlhYmxlXG4gICAgICAgIGlmICh0aGlzLmxvY2tzLnNvbWUoKGxvY2s6IExvY2spID0+IGxvY2sudGFyZ2V0RWxlbWVudCA9PT0gdGFyZ2V0RWxlbWVudCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGxvY2sgPVxuICAgICAgICB7XG4gICAgICAgICAgICB0YXJnZXRFbGVtZW50LFxuICAgICAgICAgICAgb3B0aW9uczogb3B0aW9ucyB8fCB7fSxcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvY2tzID0gWy4uLnRoaXMubG9ja3MsIGxvY2tdO1xuXG4gICAgICAgIGlmICh0aGlzLmlzSW9zRGV2aWNlKSB7XG4gICAgICAgICAgICB0YXJnZXRFbGVtZW50Lm9udG91Y2hzdGFydCA9IChldmVudDogSGFuZGxlU2Nyb2xsRXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQudGFyZ2V0VG91Y2hlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZGV0ZWN0IHNpbmdsZSB0b3VjaC5cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbml0aWFsQ2xpZW50WSA9IGV2ZW50LnRhcmdldFRvdWNoZXNbMF0uY2xpZW50WTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0YXJnZXRFbGVtZW50Lm9udG91Y2htb3ZlID0gKGV2ZW50OiBIYW5kbGVTY3JvbGxFdmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChldmVudC50YXJnZXRUb3VjaGVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBkZXRlY3Qgc2luZ2xlIHRvdWNoLlxuICAgICAgICAgICAgICAgICAgICB0aGlzLkhhbmRsZVNjcm9sbChldmVudCwgdGFyZ2V0RWxlbWVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKCF0aGlzLmRvY3VtZW50TGlzdGVuZXJBZGRlZCkge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIHRoaXMuUHJldmVudERlZmF1bHQuYmluZCh0aGlzKSxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oYXNQYXNzaXZlRXZlbnRzID8geyBwYXNzaXZlOiBmYWxzZSB9IDogdW5kZWZpbmVkKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRvY3VtZW50TGlzdGVuZXJBZGRlZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLlNldE92ZXJmbG93SGlkZGVuKG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIENsZWFyQWxsQm9keVNjcm9sbExvY2tzKCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5pc0lvc0RldmljZSkge1xuICAgICAgICAgICAgLy8gQ2xlYXIgYWxsIGxvY2tzIG9udG91Y2hzdGFydC9vbnRvdWNobW92ZSBoYW5kbGVycywgYW5kIHRoZSByZWZlcmVuY2VzLlxuICAgICAgICAgICAgdGhpcy5sb2Nrcy5mb3JFYWNoKChsb2NrOiBMb2NrKSA9PiB7XG4gICAgICAgICAgICAgICAgbG9jay50YXJnZXRFbGVtZW50Lm9udG91Y2hzdGFydCA9IG51bGw7XG4gICAgICAgICAgICAgICAgbG9jay50YXJnZXRFbGVtZW50Lm9udG91Y2htb3ZlID0gbnVsbDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5kb2N1bWVudExpc3RlbmVyQWRkZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBQYXNzaXZlIGFyZ3VtZW50IHJlbW92ZWQgYmVjYXVzZSBFdmVudExpc3RlbmVyT3B0aW9ucyBkb2Vzbid0IGNvbnRhaW4gcGFzc2l2ZSBwcm9wZXJ0eS5cbiAgICAgICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCB0aGlzLlByZXZlbnREZWZhdWx0LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgICAgIHRoaXMuZG9jdW1lbnRMaXN0ZW5lckFkZGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBSZXNldCBpbml0aWFsIGNsaWVudFkuXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxDbGllbnRZID0gLTE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLlJlc3RvcmVPdmVyZmxvd1NldHRpbmcoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMubG9ja3MgPSBbXTtcbiAgICB9XG5cbiAgICBwdWJsaWMgRW5hYmxlQm9keVNjcm9sbCh0YXJnZXRFbGVtZW50OiBhbnkpOiB2b2lkIHtcbiAgICAgICAgaWYgKCF0YXJnZXRFbGVtZW50KSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignZW5hYmxlQm9keVNjcm9sbCB1bnN1Y2Nlc3NmdWwgLSB0YXJnZXRFbGVtZW50IG11c3QgYmUgcHJvdmlkZWQgd2hlbiBjYWxsaW5nIGVuYWJsZUJvZHlTY3JvbGwgb24gSU9TIGRldmljZXMuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmxvY2tzID0gdGhpcy5sb2Nrcy5maWx0ZXIobG9jayA9PiBsb2NrLnRhcmdldEVsZW1lbnQgIT09IHRhcmdldEVsZW1lbnQpO1xuXG4gICAgICAgIGlmICh0aGlzLmlzSW9zRGV2aWNlKSB7XG4gICAgICAgICAgICB0YXJnZXRFbGVtZW50Lm9udG91Y2hzdGFydCA9IG51bGw7XG4gICAgICAgICAgICB0YXJnZXRFbGVtZW50Lm9udG91Y2htb3ZlID0gbnVsbDtcblxuICAgICAgICAgICAgaWYgKHRoaXMuZG9jdW1lbnRMaXN0ZW5lckFkZGVkICYmIHRoaXMubG9ja3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgdGhpcy5QcmV2ZW50RGVmYXVsdC5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRvY3VtZW50TGlzdGVuZXJBZGRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCF0aGlzLmxvY2tzLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5SZXN0b3JlT3ZlcmZsb3dTZXR0aW5nKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIFJlc3RvcmVPdmVyZmxvd1NldHRpbmcoKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLnByZXZpb3VzQm9keVBhZGRpbmdSaWdodCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LnN0eWxlLnBhZGRpbmdSaWdodCA9IHRoaXMucHJldmlvdXNCb2R5UGFkZGluZ1JpZ2h0O1xuXG4gICAgICAgICAgICAvLyBSZXN0b3JlIHByZXZpb3VzQm9keVBhZGRpbmdSaWdodCB0byB1bmRlZmluZWQgc28gc2V0T3ZlcmZsb3dIaWRkZW4ga25vd3MgaXRcbiAgICAgICAgICAgIC8vIGNhbiBiZSBzZXQgYWdhaW4uXG4gICAgICAgICAgICB0aGlzLnByZXZpb3VzQm9keVBhZGRpbmdSaWdodCA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLnByZXZpb3VzQm9keU92ZXJmbG93U2V0dGluZyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LnN0eWxlLm92ZXJmbG93ID0gdGhpcy5wcmV2aW91c0JvZHlPdmVyZmxvd1NldHRpbmc7XG5cbiAgICAgICAgICAgIC8vIFJlc3RvcmUgcHJldmlvdXNCb2R5T3ZlcmZsb3dTZXR0aW5nIHRvIHVuZGVmaW5lZFxuICAgICAgICAgICAgLy8gc28gc2V0T3ZlcmZsb3dIaWRkZW4ga25vd3MgaXQgY2FuIGJlIHNldCBhZ2Fpbi5cbiAgICAgICAgICAgIHRoaXMucHJldmlvdXNCb2R5T3ZlcmZsb3dTZXR0aW5nID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBTZXRPdmVyZmxvd0hpZGRlbihvcHRpb25zPzogQm9keVNjcm9sbE9wdGlvbnMpOiB2b2lkIHtcbiAgICAgICAgLy8gSWYgcHJldmlvdXNCb2R5UGFkZGluZ1JpZ2h0IGlzIGFscmVhZHkgc2V0LCBkb24ndCBzZXQgaXQgYWdhaW4uXG4gICAgICAgIGlmICh0aGlzLnByZXZpb3VzQm9keVBhZGRpbmdSaWdodCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25zdCByZXNlcnZlU2Nyb2xsQmFyR2FwID0gISFvcHRpb25zICYmIG9wdGlvbnMucmVzZXJ2ZVNjcm9sbEJhckdhcCA9PT0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbnN0IHNjcm9sbEJhckdhcCA9IHdpbmRvdy5pbm5lcldpZHRoIC0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoO1xuXG4gICAgICAgICAgICBpZiAocmVzZXJ2ZVNjcm9sbEJhckdhcCAmJiBzY3JvbGxCYXJHYXAgPiAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5wcmV2aW91c0JvZHlQYWRkaW5nUmlnaHQgPSBkb2N1bWVudC5ib2R5LnN0eWxlLnBhZGRpbmdSaWdodDtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5ib2R5LnN0eWxlLnBhZGRpbmdSaWdodCA9IGAke3Njcm9sbEJhckdhcH1weGA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWYgcHJldmlvdXNCb2R5T3ZlcmZsb3dTZXR0aW5nIGlzIGFscmVhZHkgc2V0LCBkb24ndCBzZXQgaXQgYWdhaW4uXG4gICAgICAgIGlmICh0aGlzLnByZXZpb3VzQm9keU92ZXJmbG93U2V0dGluZyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLnByZXZpb3VzQm9keU92ZXJmbG93U2V0dGluZyA9IGRvY3VtZW50LmJvZHkuc3R5bGUub3ZlcmZsb3c7XG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LnN0eWxlLm92ZXJmbG93ID0gJ2hpZGRlbic7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIFByZXZlbnREZWZhdWx0KHJhd0V2ZW50OiBIYW5kbGVTY3JvbGxFdmVudCk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBlID0gcmF3RXZlbnQgfHwgd2luZG93LmV2ZW50O1xuXG4gICAgICAgIC8vIEZvciB0aGUgY2FzZSB3aGVyZWJ5IGNvbnN1bWVycyBhZGRzIGEgdG91Y2htb3ZlIGV2ZW50IGxpc3RlbmVyIHRvIGRvY3VtZW50LlxuICAgICAgICAvLyBSZWNhbGwgdGhhdCB3ZSBkbyBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCBwcmV2ZW50RGVmYXVsdCwgeyBwYXNzaXZlOiBmYWxzZSB9KVxuICAgICAgICAvLyBpbiBkaXNhYmxlQm9keVNjcm9sbCAtIHNvIGlmIHdlIHByb3ZpZGUgdGhpcyBvcHBvcnR1bml0eSB0byBhbGxvd1RvdWNoTW92ZSwgdGhlblxuICAgICAgICAvLyB0aGUgdG91Y2htb3ZlIGV2ZW50IG9uIGRvY3VtZW50IHdpbGwgYnJlYWsuXG4gICAgICAgIGlmICh0aGlzLkFsbG93VG91Y2hNb3ZlKGUudGFyZ2V0KSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRG8gbm90IHByZXZlbnQgaWYgdGhlIGV2ZW50IGhhcyBtb3JlIHRoYW4gb25lIHRvdWNoICh1c3VhbGx5IG1lYW5pbmcgdGhpcyBpcyBhIG11bHRpIHRvdWNoIGdlc3R1cmUgbGlrZSBwaW5jaCB0byB6b29tKS5cbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICBpZiAoZS50b3VjaGVzLmxlbmd0aCA+IDEpIHsgcmV0dXJuIHRydWU7IH1cblxuICAgICAgICBpZiAoZS5wcmV2ZW50RGVmYXVsdCkgeyBlLnByZXZlbnREZWZhdWx0KCk7IH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBIYW5kbGVTY3JvbGwoZXZlbnQ6IEhhbmRsZVNjcm9sbEV2ZW50LCB0YXJnZXRFbGVtZW50OiBhbnkpOiBhbnlcbiAgICB7XG4gICAgICAgIGNvbnN0IGNsaWVudFkgPSBldmVudC50YXJnZXRUb3VjaGVzWzBdLmNsaWVudFkgLSB0aGlzLmluaXRpYWxDbGllbnRZO1xuXG4gICAgICAgIGlmICh0aGlzLkFsbG93VG91Y2hNb3ZlKGV2ZW50LnRhcmdldCkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0YXJnZXRFbGVtZW50ICYmIHRhcmdldEVsZW1lbnQuc2Nyb2xsVG9wID09PSAwICYmIGNsaWVudFkgPiAwKSB7XG4gICAgICAgICAgICAvLyBlbGVtZW50IGlzIGF0IHRoZSB0b3Agb2YgaXRzIHNjcm9sbC5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLlByZXZlbnREZWZhdWx0KGV2ZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmlzVGFyZ2V0RWxlbWVudFRvdGFsbHlTY3JvbGxlZCh0YXJnZXRFbGVtZW50KSAmJiBjbGllbnRZIDwgMCkge1xuICAgICAgICAgICAgLy8gZWxlbWVudCBpcyBhdCB0aGUgYm90dG9tIG9mIGl0cyBzY3JvbGwuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5QcmV2ZW50RGVmYXVsdChldmVudCk7XG4gICAgICAgIH1cblxuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBpc1RhcmdldEVsZW1lbnRUb3RhbGx5U2Nyb2xsZWQodGFyZ2V0RWxlbWVudDogYW55KTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0YXJnZXRFbGVtZW50ID8gdGFyZ2V0RWxlbWVudC5zY3JvbGxIZWlnaHQgLSB0YXJnZXRFbGVtZW50LnNjcm9sbFRvcCA8PSB0YXJnZXRFbGVtZW50LmNsaWVudEhlaWdodCA6IGZhbHNlO1xuICAgIH1cbiAgICBwcml2YXRlIEFsbG93VG91Y2hNb3ZlKGVsOiBFdmVudFRhcmdldCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5sb2Nrcy5zb21lKGxvY2sgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGxvY2sub3B0aW9ucy5hbGxvd1RvdWNoTW92ZSAmJiBsb2NrLm9wdGlvbnMuYWxsb3dUb3VjaE1vdmUoZWwpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIENoZWNrSWZJc0lvc0RldmljZSgpOiB2b2lkXG4gICAge1xuICAgICAgICB0aGlzLmlzSW9zRGV2aWNlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgICAgICAgIHdpbmRvdy5uYXZpZ2F0b3IgJiZcbiAgICAgICAgICAgIHdpbmRvdy5uYXZpZ2F0b3IucGxhdGZvcm0gJiZcbiAgICAgICAgICAgICgvaVAoYWR8aG9uZXxvZCkvLnRlc3Qod2luZG93Lm5hdmlnYXRvci5wbGF0Zm9ybSkgfHxcbiAgICAgICAgICAgICAgICAod2luZG93Lm5hdmlnYXRvci5wbGF0Zm9ybSA9PT0gJ01hY0ludGVsJyAmJiB3aW5kb3cubmF2aWdhdG9yLm1heFRvdWNoUG9pbnRzID4gMSkpO1xuICAgIH1cblxuICAgIHByaXZhdGUgVGVzdFBhc3NpdmUoKTogdm9pZFxuICAgIHtcbiAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKVxuICAgICAgICB7XG4gICAgICAgICAgICBjb25zdCBwYXNzaXZlVGVzdE9wdGlvbnMgPVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGdldCBwYXNzaXZlKClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGFzUGFzc2l2ZUV2ZW50cyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0ZXN0UGFzc2l2ZScsIG51bGwsIHBhc3NpdmVUZXN0T3B0aW9ucyk7XG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGVzdFBhc3NpdmUnLCBudWxsLCBwYXNzaXZlVGVzdE9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgfVxufVxuIl19