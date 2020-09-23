import { __decorate, __read, __spread } from "tslib";
import { Injectable, Renderer2 } from '@angular/core';
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
export { NgBodyScrollLockService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctYm9keS1zY3JvbGwtbG9jay5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6Im5nOi8vbmctYm9keS1zY3JvbGwtbG9jay8iLCJzb3VyY2VzIjpbImxpYi9uZy1ib2R5LXNjcm9sbC1sb2NrLnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBaUJ0RDtJQVVJLGlDQUFvQixRQUFtQjtRQUFuQixhQUFRLEdBQVIsUUFBUSxDQUFXO1FBUi9CLHFCQUFnQixHQUFHLEtBQUssQ0FBQztRQUV6QixtQkFBYyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3BCLFVBQUssR0FBVyxFQUFFLENBQUM7UUFDbkIsMEJBQXFCLEdBQUcsS0FBSyxDQUFDO1FBTWxDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNuQixJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBRU0sbURBQWlCLEdBQXhCLFVBQXlCLGFBQWtCLEVBQUUsT0FBMkI7UUFBeEUsaUJBNkNDO1FBNUNHLGlDQUFpQztRQUNqQyxJQUFJLENBQUMsYUFBYSxFQUFFO1lBQ2hCLHNDQUFzQztZQUN0QyxPQUFPLENBQUMsS0FBSyxDQUFDLGdIQUFnSCxDQUFDLENBQUM7WUFDaEksT0FBTztTQUNWO1FBRUQsMkVBQTJFO1FBQzNFLGdEQUFnRDtRQUNoRCxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQUMsSUFBVSxJQUFLLE9BQUEsSUFBSSxDQUFDLGFBQWEsS0FBSyxhQUFhLEVBQXBDLENBQW9DLENBQUMsRUFBRTtZQUN2RSxPQUFPO1NBQ1Y7UUFFRCxJQUFNLElBQUksR0FDVjtZQUNJLGFBQWEsZUFBQTtZQUNiLE9BQU8sRUFBRSxPQUFPLElBQUksRUFBRTtTQUN6QixDQUFDO1FBRUYsSUFBSSxDQUFDLEtBQUssWUFBTyxJQUFJLENBQUMsS0FBSyxHQUFFLElBQUksRUFB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LENBQUMsUUFBUSxDQUFDO2dCQUM3QyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxLQUFLLFVBQVUsSUFBSSxNQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9GLENBQUM7SUFFTyw2Q0FBVyxHQUFuQjtRQUVJLElBQUksT0FBTyxNQUFNLEtBQUssV0FBVyxFQUNqQztZQUNJLElBQU0sa0JBQWtCLEdBQ3hCO2dCQUNJLElBQUksT0FBTztvQkFFUCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO29CQUM3QixPQUFPLFNBQVMsQ0FBQztnQkFDckIsQ0FBQzthQUNKLENBQUM7WUFDRixNQUFNLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxFQUFFLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1lBQ2pFLGFBQWE7WUFDYixNQUFNLENBQUMsbUJBQW1CLENBQUMsYUFBYSxFQUFFLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1NBQ3ZFO0lBQ0wsQ0FBQzs7Z0JBaE42QixTQUFTOztJQVY5Qix1QkFBdUI7UUFEbkMsVUFBVSxFQUFFO09BQ0EsdUJBQXVCLENBMk5uQztJQUFELDhCQUFDO0NBQUEsQUEzTkQsSUEyTkM7U0EzTlksdUJBQXVCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgSW5qZWN0YWJsZSwgUmVuZGVyZXIyIH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQm9keVNjcm9sbE9wdGlvbnNcbntcbiAgICByZXNlcnZlU2Nyb2xsQmFyR2FwPzogYm9vbGVhbjtcbiAgICBhbGxvd1RvdWNoTW92ZT86IChlbDogYW55KSA9PiBib29sZWFuO1xufVxuXG5pbnRlcmZhY2UgTG9ja1xue1xuICAgIHRhcmdldEVsZW1lbnQ6IGFueTtcbiAgICBvcHRpb25zOiBCb2R5U2Nyb2xsT3B0aW9ucztcbn1cblxudHlwZSBIYW5kbGVTY3JvbGxFdmVudCA9IFRvdWNoRXZlbnQ7XG5cbkBJbmplY3RhYmxlKClcbmV4cG9ydCBjbGFzcyBOZ0JvZHlTY3JvbGxMb2NrU2VydmljZVxue1xuICAgIHByaXZhdGUgaGFzUGFzc2l2ZUV2ZW50cyA9IGZhbHNlO1xuICAgIHByaXZhdGUgaXNJb3NEZXZpY2U6IGJvb2xlYW47XG4gICAgcHJpdmF0ZSBpbml0aWFsQ2xpZW50WSA9IC0xO1xuICAgIHByaXZhdGUgbG9ja3M6IExvY2tbXSA9IFtdO1xuICAgIHByaXZhdGUgZG9jdW1lbnRMaXN0ZW5lckFkZGVkID0gZmFsc2U7XG4gICAgcHJpdmF0ZSBwcmV2aW91c0JvZHlQYWRkaW5nUmlnaHQ6IHN0cmluZztcbiAgICBwcml2YXRlIHByZXZpb3VzQm9keU92ZXJmbG93U2V0dGluZzogc3RyaW5nO1xuXG4gICAgY29uc3RydWN0b3IocHJpdmF0ZSByZW5kZXJlcjogUmVuZGVyZXIyKVxuICAgIHtcbiAgICAgICAgdGhpcy5UZXN0UGFzc2l2ZSgpO1xuICAgICAgICB0aGlzLkNoZWNrSWZJc0lvc0RldmljZSgpO1xuICAgIH1cblxuICAgIHB1YmxpYyBEaXNhYmxlQm9keVNjcm9sbCh0YXJnZXRFbGVtZW50OiBhbnksIG9wdGlvbnM/OiBCb2R5U2Nyb2xsT3B0aW9ucyk6IHZvaWQge1xuICAgICAgICAvLyB0YXJnZXRFbGVtZW50IG11c3QgYmUgcHJvdmlkZWRcbiAgICAgICAgaWYgKCF0YXJnZXRFbGVtZW50KSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignZGlzYWJsZUJvZHlTY3JvbGwgdW5zdWNjZXNzZnVsIC0gdGFyZ2V0RWxlbWVudCBtdXN0IGJlIHByb3ZpZGVkIHdoZW4gY2FsbGluZyBkaXNhYmxlQm9keVNjcm9sbCBvbiBJT1MgZGV2aWNlcy4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGRpc2FibGVCb2R5U2Nyb2xsIG11c3Qgbm90IGhhdmUgYmVlbiBjYWxsZWQgb24gdGhpcyB0YXJnZXRFbGVtZW50IGJlZm9yZVxuICAgICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6bm8tc2hhZG93ZWQtdmFyaWFibGVcbiAgICAgICAgaWYgKHRoaXMubG9ja3Muc29tZSgobG9jazogTG9jaykgPT4gbG9jay50YXJnZXRFbGVtZW50ID09PSB0YXJnZXRFbGVtZW50KSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgbG9jayA9XG4gICAgICAgIHtcbiAgICAgICAgICAgIHRhcmdldEVsZW1lbnQsXG4gICAgICAgICAgICBvcHRpb25zOiBvcHRpb25zIHx8IHt9LFxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9ja3MgPSBbLi4udGhpcy5sb2NrcywgbG9ja107XG5cbiAgICAgICAgaWYgKHRoaXMuaXNJb3NEZXZpY2UpIHtcbiAgICAgICAgICAgIHRhcmdldEVsZW1lbnQub250b3VjaHN0YXJ0ID0gKGV2ZW50OiBIYW5kbGVTY3JvbGxFdmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChldmVudC50YXJnZXRUb3VjaGVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBkZXRlY3Qgc2luZ2xlIHRvdWNoLlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmluaXRpYWxDbGllbnRZID0gZXZlbnQudGFyZ2V0VG91Y2hlc1swXS5jbGllbnRZO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHRhcmdldEVsZW1lbnQub250b3VjaG1vdmUgPSAoZXZlbnQ6IEhhbmRsZVNjcm9sbEV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50LnRhcmdldFRvdWNoZXMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGRldGVjdCBzaW5nbGUgdG91Y2guXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuSGFuZGxlU2Nyb2xsKGV2ZW50LCB0YXJnZXRFbGVtZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZiAoIXRoaXMuZG9jdW1lbnRMaXN0ZW5lckFkZGVkKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgdGhpcy5QcmV2ZW50RGVmYXVsdC5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmhhc1Bhc3NpdmVFdmVudHMgPyB7IHBhc3NpdmU6IGZhbHNlIH0gOiB1bmRlZmluZWQpO1xuICAgICAgICAgICAgICAgIHRoaXMuZG9jdW1lbnRMaXN0ZW5lckFkZGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuU2V0T3ZlcmZsb3dIaWRkZW4ob3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwdWJsaWMgQ2xlYXJBbGxCb2R5U2Nyb2xsTG9ja3MoKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLmlzSW9zRGV2aWNlKSB7XG4gICAgICAgICAgICAvLyBDbGVhciBhbGwgbG9ja3Mgb250b3VjaHN0YXJ0L29udG91Y2htb3ZlIGhhbmRsZXJzLCBhbmQgdGhlIHJlZmVyZW5jZXMuXG4gICAgICAgICAgICB0aGlzLmxvY2tzLmZvckVhY2goKGxvY2s6IExvY2spID0+IHtcbiAgICAgICAgICAgICAgICBsb2NrLnRhcmdldEVsZW1lbnQub250b3VjaHN0YXJ0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICBsb2NrLnRhcmdldEVsZW1lbnQub250b3VjaG1vdmUgPSBudWxsO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICh0aGlzLmRvY3VtZW50TGlzdGVuZXJBZGRlZCkge1xuICAgICAgICAgICAgICAgIC8vIFBhc3NpdmUgYXJndW1lbnQgcmVtb3ZlZCBiZWNhdXNlIEV2ZW50TGlzdGVuZXJPcHRpb25zIGRvZXNuJ3QgY29udGFpbiBwYXNzaXZlIHByb3BlcnR5LlxuICAgICAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIHRoaXMuUHJldmVudERlZmF1bHQuYmluZCh0aGlzKSk7XG4gICAgICAgICAgICAgICAgdGhpcy5kb2N1bWVudExpc3RlbmVyQWRkZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFJlc2V0IGluaXRpYWwgY2xpZW50WS5cbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbENsaWVudFkgPSAtMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuUmVzdG9yZU92ZXJmbG93U2V0dGluZygpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5sb2NrcyA9IFtdO1xuICAgIH1cblxuICAgIHB1YmxpYyBFbmFibGVCb2R5U2Nyb2xsKHRhcmdldEVsZW1lbnQ6IGFueSk6IHZvaWQge1xuICAgICAgICBpZiAoIXRhcmdldEVsZW1lbnQpIHtcbiAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdlbmFibGVCb2R5U2Nyb2xsIHVuc3VjY2Vzc2Z1bCAtIHRhcmdldEVsZW1lbnQgbXVzdCBiZSBwcm92aWRlZCB3aGVuIGNhbGxpbmcgZW5hYmxlQm9keVNjcm9sbCBvbiBJT1MgZGV2aWNlcy4nKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMubG9ja3MgPSB0aGlzLmxvY2tzLmZpbHRlcihsb2NrID0+IGxvY2sudGFyZ2V0RWxlbWVudCAhPT0gdGFyZ2V0RWxlbWVudCk7XG5cbiAgICAgICAgaWYgKHRoaXMuaXNJb3NEZXZpY2UpIHtcbiAgICAgICAgICAgIHRhcmdldEVsZW1lbnQub250b3VjaHN0YXJ0ID0gbnVsbDtcbiAgICAgICAgICAgIHRhcmdldEVsZW1lbnQub250b3VjaG1vdmUgPSBudWxsO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5kb2N1bWVudExpc3RlbmVyQWRkZWQgJiYgdGhpcy5sb2Nrcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCB0aGlzLlByZXZlbnREZWZhdWx0LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgICAgIHRoaXMuZG9jdW1lbnRMaXN0ZW5lckFkZGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoIXRoaXMubG9ja3MubGVuZ3RoKSB7XG4gICAgICAgICAgICB0aGlzLlJlc3RvcmVPdmVyZmxvd1NldHRpbmcoKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgUmVzdG9yZU92ZXJmbG93U2V0dGluZygpOiB2b2lkIHtcbiAgICAgICAgaWYgKHRoaXMucHJldmlvdXNCb2R5UGFkZGluZ1JpZ2h0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyZXIuc2V0U3R5bGUoZG9jdW1lbnQuYm9keSwgJ3BhZGRpbmctcmlnaHQnLCB0aGlzLnByZXZpb3VzQm9keVBhZGRpbmdSaWdodCk7XG5cbiAgICAgICAgICAgIC8vIFJlc3RvcmUgcHJldmlvdXNCb2R5UGFkZGluZ1JpZ2h0IHRvIHVuZGVmaW5lZCBzbyBzZXRPdmVyZmxvd0hpZGRlbiBrbm93cyBpdFxuICAgICAgICAgICAgLy8gY2FuIGJlIHNldCBhZ2Fpbi5cbiAgICAgICAgICAgIHRoaXMucHJldmlvdXNCb2R5UGFkZGluZ1JpZ2h0ID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMucHJldmlvdXNCb2R5T3ZlcmZsb3dTZXR0aW5nICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMucmVuZGVyZXIuc2V0U3R5bGUoZG9jdW1lbnQuYm9keSwgJ292ZXJmbG93JywgdGhpcy5wcmV2aW91c0JvZHlPdmVyZmxvd1NldHRpbmcpO1xuXG4gICAgICAgICAgICAvLyBSZXN0b3JlIHByZXZpb3VzQm9keU92ZXJmbG93U2V0dGluZyB0byB1bmRlZmluZWRcbiAgICAgICAgICAgIC8vIHNvIHNldE92ZXJmbG93SGlkZGVuIGtub3dzIGl0IGNhbiBiZSBzZXQgYWdhaW4uXG4gICAgICAgICAgICB0aGlzLnByZXZpb3VzQm9keU92ZXJmbG93U2V0dGluZyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgU2V0T3ZlcmZsb3dIaWRkZW4ob3B0aW9ucz86IEJvZHlTY3JvbGxPcHRpb25zKTogdm9pZCB7XG4gICAgICAgIC8vIElmIHByZXZpb3VzQm9keVBhZGRpbmdSaWdodCBpcyBhbHJlYWR5IHNldCwgZG9uJ3Qgc2V0IGl0IGFnYWluLlxuICAgICAgICBpZiAodGhpcy5wcmV2aW91c0JvZHlQYWRkaW5nUmlnaHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc3QgcmVzZXJ2ZVNjcm9sbEJhckdhcCA9ICEhb3B0aW9ucyAmJiBvcHRpb25zLnJlc2VydmVTY3JvbGxCYXJHYXAgPT09IHRydWU7XG4gICAgICAgICAgICBjb25zdCBzY3JvbGxCYXJHYXAgPSB3aW5kb3cuaW5uZXJXaWR0aCAtIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGllbnRXaWR0aDtcblxuICAgICAgICAgICAgaWYgKHJlc2VydmVTY3JvbGxCYXJHYXAgJiYgc2Nyb2xsQmFyR2FwID4gMCkge1xuICAgICAgICAgICAgICAgIHRoaXMucHJldmlvdXNCb2R5UGFkZGluZ1JpZ2h0ID0gZG9jdW1lbnQuYm9keS5zdHlsZS5wYWRkaW5nUmlnaHQ7XG4gICAgICAgICAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRTdHlsZShkb2N1bWVudC5ib2R5LCAncGFkZGluZy1yaWdodCcsIGAke3Njcm9sbEJhckdhcH1weGApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIC8vIElmIHByZXZpb3VzQm9keU92ZXJmbG93U2V0dGluZyBpcyBhbHJlYWR5IHNldCwgZG9uJ3Qgc2V0IGl0IGFnYWluLlxuICAgICAgICBpZiAodGhpcy5wcmV2aW91c0JvZHlPdmVyZmxvd1NldHRpbmcgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhpcy5wcmV2aW91c0JvZHlPdmVyZmxvd1NldHRpbmcgPSBkb2N1bWVudC5ib2R5LnN0eWxlLm92ZXJmbG93O1xuICAgICAgICAgICAgdGhpcy5yZW5kZXJlci5zZXRTdHlsZShkb2N1bWVudC5ib2R5LCAnb3ZlcmZsb3cnLCAnaGlkZGVuJyk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIFByZXZlbnREZWZhdWx0KHJhd0V2ZW50OiBIYW5kbGVTY3JvbGxFdmVudCk6IGJvb2xlYW4ge1xuICAgICAgICBjb25zdCBlID0gcmF3RXZlbnQgfHwgd2luZG93LmV2ZW50O1xuXG4gICAgICAgIC8vIEZvciB0aGUgY2FzZSB3aGVyZWJ5IGNvbnN1bWVycyBhZGRzIGEgdG91Y2htb3ZlIGV2ZW50IGxpc3RlbmVyIHRvIGRvY3VtZW50LlxuICAgICAgICAvLyBSZWNhbGwgdGhhdCB3ZSBkbyBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCBwcmV2ZW50RGVmYXVsdCwgeyBwYXNzaXZlOiBmYWxzZSB9KVxuICAgICAgICAvLyBpbiBkaXNhYmxlQm9keVNjcm9sbCAtIHNvIGlmIHdlIHByb3ZpZGUgdGhpcyBvcHBvcnR1bml0eSB0byBhbGxvd1RvdWNoTW92ZSwgdGhlblxuICAgICAgICAvLyB0aGUgdG91Y2htb3ZlIGV2ZW50IG9uIGRvY3VtZW50IHdpbGwgYnJlYWsuXG4gICAgICAgIGlmICh0aGlzLkFsbG93VG91Y2hNb3ZlKGUudGFyZ2V0KSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgLy8gRG8gbm90IHByZXZlbnQgaWYgdGhlIGV2ZW50IGhhcyBtb3JlIHRoYW4gb25lIHRvdWNoICh1c3VhbGx5IG1lYW5pbmcgdGhpcyBpcyBhIG11bHRpIHRvdWNoIGdlc3R1cmUgbGlrZSBwaW5jaCB0byB6b29tKS5cbiAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICBpZiAoZS50b3VjaGVzLmxlbmd0aCA+IDEpIHsgcmV0dXJuIHRydWU7IH1cblxuICAgICAgICBpZiAoZS5wcmV2ZW50RGVmYXVsdCkgeyBlLnByZXZlbnREZWZhdWx0KCk7IH1cblxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBIYW5kbGVTY3JvbGwoZXZlbnQ6IEhhbmRsZVNjcm9sbEV2ZW50LCB0YXJnZXRFbGVtZW50OiBhbnkpOiBhbnlcbiAgICB7XG4gICAgICAgIGNvbnN0IGNsaWVudFkgPSBldmVudC50YXJnZXRUb3VjaGVzWzBdLmNsaWVudFkgLSB0aGlzLmluaXRpYWxDbGllbnRZO1xuXG4gICAgICAgIGlmICh0aGlzLkFsbG93VG91Y2hNb3ZlKGV2ZW50LnRhcmdldCkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0YXJnZXRFbGVtZW50ICYmIHRhcmdldEVsZW1lbnQuc2Nyb2xsVG9wID09PSAwICYmIGNsaWVudFkgPiAwKSB7XG4gICAgICAgICAgICAvLyBlbGVtZW50IGlzIGF0IHRoZSB0b3Agb2YgaXRzIHNjcm9sbC5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLlByZXZlbnREZWZhdWx0KGV2ZW50KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmlzVGFyZ2V0RWxlbWVudFRvdGFsbHlTY3JvbGxlZCh0YXJnZXRFbGVtZW50KSAmJiBjbGllbnRZIDwgMCkge1xuICAgICAgICAgICAgLy8gZWxlbWVudCBpcyBhdCB0aGUgYm90dG9tIG9mIGl0cyBzY3JvbGwuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5QcmV2ZW50RGVmYXVsdChldmVudCk7XG4gICAgICAgIH1cblxuICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBpc1RhcmdldEVsZW1lbnRUb3RhbGx5U2Nyb2xsZWQodGFyZ2V0RWxlbWVudDogYW55KTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiB0YXJnZXRFbGVtZW50ID8gdGFyZ2V0RWxlbWVudC5zY3JvbGxIZWlnaHQgLSB0YXJnZXRFbGVtZW50LnNjcm9sbFRvcCA8PSB0YXJnZXRFbGVtZW50LmNsaWVudEhlaWdodCA6IGZhbHNlO1xuICAgIH1cbiAgICBwcml2YXRlIEFsbG93VG91Y2hNb3ZlKGVsOiBFdmVudFRhcmdldCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGhpcy5sb2Nrcy5zb21lKGxvY2sgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIGxvY2sub3B0aW9ucy5hbGxvd1RvdWNoTW92ZSAmJiBsb2NrLm9wdGlvbnMuYWxsb3dUb3VjaE1vdmUoZWwpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBwcml2YXRlIENoZWNrSWZJc0lvc0RldmljZSgpOiB2b2lkXG4gICAge1xuICAgICAgICB0aGlzLmlzSW9zRGV2aWNlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgICAgICAgIHdpbmRvdy5uYXZpZ2F0b3IgJiZcbiAgICAgICAgICAgIHdpbmRvdy5uYXZpZ2F0b3IucGxhdGZvcm0gJiZcbiAgICAgICAgICAgICgvaVAoYWR8aG9uZXxvZCkvLnRlc3Qod2luZG93Lm5hdmlnYXRvci5wbGF0Zm9ybSkgfHxcbiAgICAgICAgICAgICAgICAod2luZG93Lm5hdmlnYXRvci5wbGF0Zm9ybSA9PT0gJ01hY0ludGVsJyAmJiB3aW5kb3cubmF2aWdhdG9yLm1heFRvdWNoUG9pbnRzID4gMSkpO1xuICAgIH1cblxuICAgIHByaXZhdGUgVGVzdFBhc3NpdmUoKTogdm9pZFxuICAgIHtcbiAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKVxuICAgICAgICB7XG4gICAgICAgICAgICBjb25zdCBwYXNzaXZlVGVzdE9wdGlvbnMgPVxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGdldCBwYXNzaXZlKClcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGFzUGFzc2l2ZUV2ZW50cyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0ZXN0UGFzc2l2ZScsIG51bGwsIHBhc3NpdmVUZXN0T3B0aW9ucyk7XG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigndGVzdFBhc3NpdmUnLCBudWxsLCBwYXNzaXZlVGVzdE9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgfVxufVxuIl19