import { __decorate } from "tslib";
import { Injectable, Renderer2 } from '@angular/core';
let NgBodyScrollLockService = class NgBodyScrollLockService {
    constructor(renderer) {
        this.renderer = renderer;
        this.hasPassiveEvents = false;
        this.initialClientY = -1;
        this.locks = [];
        this.documentListenerAdded = false;
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
        };
        this.locks = [...this.locks, lock];
        if (this.isIosDevice) {
            targetElement.ontouchstart = (event) => {
                if (event.targetTouches.length === 1) {
                    // detect single touch.
                    this.initialClientY = event.targetTouches[0].clientY;
                }
            };
            targetElement.ontouchmove = (event) => {
                if (event.targetTouches.length === 1) {
                    // detect single touch.
                    this.HandleScroll(event, targetElement);
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
    }
    ClearAllBodyScrollLocks() {
        if (this.isIosDevice) {
            // Clear all locks ontouchstart/ontouchmove handlers, and the references.
            this.locks.forEach((lock) => {
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
    }
    EnableBodyScroll(targetElement) {
        if (!targetElement) {
            // eslint-disable-next-line no-console
            console.error('enableBodyScroll unsuccessful - targetElement must be provided when calling enableBodyScroll on IOS devices.');
            return;
        }
        this.locks = this.locks.filter(lock => lock.targetElement !== targetElement);
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
            window.addEventListener('testPassive', null, passiveTestOptions);
            // @ts-ignore
            window.removeEventListener('testPassive', null, passiveTestOptions);
        }
    }
};
NgBodyScrollLockService.ctorParameters = () => [
    { type: Renderer2 }
];
NgBodyScrollLockService = __decorate([
    Injectable()
], NgBodyScrollLockService);
export { NgBodyScrollLockService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmctYm9keS1zY3JvbGwtbG9jay5zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6Im5nOi8vbmctYm9keS1zY3JvbGwtbG9jay8iLCJzb3VyY2VzIjpbImxpYi9uZy1ib2R5LXNjcm9sbC1sb2NrLnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBaUJ0RCxJQUFhLHVCQUF1QixHQUFwQyxNQUFhLHVCQUF1QjtJQVVoQyxZQUFvQixRQUFtQjtRQUFuQixhQUFRLEdBQVIsUUFBUSxDQUFXO1FBUi9CLHFCQUFnQixHQUFHLEtBQUssQ0FBQztRQUV6QixtQkFBYyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3BCLFVBQUssR0FBVyxFQUFFLENBQUM7UUFDbkIsMEJBQXFCLEdBQUcsS0FBSyxDQUFDO1FBTWxDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNuQixJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztJQUM5QixDQUFDO0lBRU0saUJBQWlCLENBQUMsYUFBa0IsRUFBRSxPQUEyQjtRQUNwRSxpQ0FBaUM7UUFDakMsSUFBSSxDQUFDLGFBQWEsRUFBRTtZQUNoQixzQ0FBc0M7WUFDdEMsT0FBTyxDQUFDLEtBQUssQ0FBQyxnSEFBZ0gsQ0FBQyxDQUFDO1lBQ2hJLE9BQU87U0FDVjtRQUVELDJFQUEyRTtRQUMzRSxnREFBZ0Q7UUFDaEQsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQVUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGFBQWEsS0FBSyxhQUFhLENBQUMsRUFBRTtZQUN2RSxPQUFPO1NBQ1Y7UUFFRCxNQUFNLElBQUksR0FDVjtZQUNJLGFBQWE7WUFDYixPQUFPLEVBQUUsT0FBTyxJQUFJLEVBQUU7U0FDekIsQ0FBQztRQUVGLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUs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QUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsUUFBUSxLQUFLLFVBQVUsSUFBSSxNQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQy9GLENBQUM7SUFFTyxXQUFXO1FBRWYsSUFBSSxPQUFPLE1BQU0sS0FBSyxXQUFXLEVBQ2pDO1lBQ0ksTUFBTSxrQkFBa0IsR0FDeEI7Z0JBQ0ksSUFBSSxPQUFPO29CQUVQLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7b0JBQzdCLE9BQU8sU0FBUyxDQUFDO2dCQUNyQixDQUFDO2FBQ0osQ0FBQztZQUNGLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixDQUFDLENBQUM7WUFDakUsYUFBYTtZQUNiLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxhQUFhLEVBQUUsSUFBSSxFQUFFLGtCQUFrQixDQUFDLENBQUM7U0FDdkU7SUFDTCxDQUFDO0NBQ0osQ0FBQTs7WUFqTmlDLFNBQVM7O0FBVjlCLHVCQUF1QjtJQURuQyxVQUFVLEVBQUU7R0FDQSx1QkFBdUIsQ0EyTm5DO1NBM05ZLHVCQUF1QiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEluamVjdGFibGUsIFJlbmRlcmVyMiB9IGZyb20gJ0Bhbmd1bGFyL2NvcmUnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEJvZHlTY3JvbGxPcHRpb25zXG57XG4gICAgcmVzZXJ2ZVNjcm9sbEJhckdhcD86IGJvb2xlYW47XG4gICAgYWxsb3dUb3VjaE1vdmU/OiAoZWw6IGFueSkgPT4gYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIExvY2tcbntcbiAgICB0YXJnZXRFbGVtZW50OiBhbnk7XG4gICAgb3B0aW9uczogQm9keVNjcm9sbE9wdGlvbnM7XG59XG5cbnR5cGUgSGFuZGxlU2Nyb2xsRXZlbnQgPSBUb3VjaEV2ZW50O1xuXG5ASW5qZWN0YWJsZSgpXG5leHBvcnQgY2xhc3MgTmdCb2R5U2Nyb2xsTG9ja1NlcnZpY2VcbntcbiAgICBwcml2YXRlIGhhc1Bhc3NpdmVFdmVudHMgPSBmYWxzZTtcbiAgICBwcml2YXRlIGlzSW9zRGV2aWNlOiBib29sZWFuO1xuICAgIHByaXZhdGUgaW5pdGlhbENsaWVudFkgPSAtMTtcbiAgICBwcml2YXRlIGxvY2tzOiBMb2NrW10gPSBbXTtcbiAgICBwcml2YXRlIGRvY3VtZW50TGlzdGVuZXJBZGRlZCA9IGZhbHNlO1xuICAgIHByaXZhdGUgcHJldmlvdXNCb2R5UGFkZGluZ1JpZ2h0OiBzdHJpbmc7XG4gICAgcHJpdmF0ZSBwcmV2aW91c0JvZHlPdmVyZmxvd1NldHRpbmc6IHN0cmluZztcblxuICAgIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVuZGVyZXI6IFJlbmRlcmVyMilcbiAgICB7XG4gICAgICAgIHRoaXMuVGVzdFBhc3NpdmUoKTtcbiAgICAgICAgdGhpcy5DaGVja0lmSXNJb3NEZXZpY2UoKTtcbiAgICB9XG5cbiAgICBwdWJsaWMgRGlzYWJsZUJvZHlTY3JvbGwodGFyZ2V0RWxlbWVudDogYW55LCBvcHRpb25zPzogQm9keVNjcm9sbE9wdGlvbnMpOiB2b2lkIHtcbiAgICAgICAgLy8gdGFyZ2V0RWxlbWVudCBtdXN0IGJlIHByb3ZpZGVkXG4gICAgICAgIGlmICghdGFyZ2V0RWxlbWVudCkge1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2Rpc2FibGVCb2R5U2Nyb2xsIHVuc3VjY2Vzc2Z1bCAtIHRhcmdldEVsZW1lbnQgbXVzdCBiZSBwcm92aWRlZCB3aGVuIGNhbGxpbmcgZGlzYWJsZUJvZHlTY3JvbGwgb24gSU9TIGRldmljZXMuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBkaXNhYmxlQm9keVNjcm9sbCBtdXN0IG5vdCBoYXZlIGJlZW4gY2FsbGVkIG9uIHRoaXMgdGFyZ2V0RWxlbWVudCBiZWZvcmVcbiAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLXNoYWRvd2VkLXZhcmlhYmxlXG4gICAgICAgIGlmICh0aGlzLmxvY2tzLnNvbWUoKGxvY2s6IExvY2spID0+IGxvY2sudGFyZ2V0RWxlbWVudCA9PT0gdGFyZ2V0RWxlbWVudCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGxvY2sgPVxuICAgICAgICB7XG4gICAgICAgICAgICB0YXJnZXRFbGVtZW50LFxuICAgICAgICAgICAgb3B0aW9uczogb3B0aW9ucyB8fCB7fSxcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvY2tzID0gWy4uLnRoaXMubG9ja3MsIGxvY2tdO1xuXG4gICAgICAgIGlmICh0aGlzLmlzSW9zRGV2aWNlKSB7XG4gICAgICAgICAgICB0YXJnZXRFbGVtZW50Lm9udG91Y2hzdGFydCA9IChldmVudDogSGFuZGxlU2Nyb2xsRXZlbnQpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQudGFyZ2V0VG91Y2hlcy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gZGV0ZWN0IHNpbmdsZSB0b3VjaC5cbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pbml0aWFsQ2xpZW50WSA9IGV2ZW50LnRhcmdldFRvdWNoZXNbMF0uY2xpZW50WTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB0YXJnZXRFbGVtZW50Lm9udG91Y2htb3ZlID0gKGV2ZW50OiBIYW5kbGVTY3JvbGxFdmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChldmVudC50YXJnZXRUb3VjaGVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBkZXRlY3Qgc2luZ2xlIHRvdWNoLlxuICAgICAgICAgICAgICAgICAgICB0aGlzLkhhbmRsZVNjcm9sbChldmVudCwgdGFyZ2V0RWxlbWVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKCF0aGlzLmRvY3VtZW50TGlzdGVuZXJBZGRlZCkge1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIHRoaXMuUHJldmVudERlZmF1bHQuYmluZCh0aGlzKSxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oYXNQYXNzaXZlRXZlbnRzID8geyBwYXNzaXZlOiBmYWxzZSB9IDogdW5kZWZpbmVkKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRvY3VtZW50TGlzdGVuZXJBZGRlZCA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLlNldE92ZXJmbG93SGlkZGVuKG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHVibGljIENsZWFyQWxsQm9keVNjcm9sbExvY2tzKCk6IHZvaWQge1xuICAgICAgICBpZiAodGhpcy5pc0lvc0RldmljZSkge1xuICAgICAgICAgICAgLy8gQ2xlYXIgYWxsIGxvY2tzIG9udG91Y2hzdGFydC9vbnRvdWNobW92ZSBoYW5kbGVycywgYW5kIHRoZSByZWZlcmVuY2VzLlxuICAgICAgICAgICAgdGhpcy5sb2Nrcy5mb3JFYWNoKChsb2NrOiBMb2NrKSA9PiB7XG4gICAgICAgICAgICAgICAgbG9jay50YXJnZXRFbGVtZW50Lm9udG91Y2hzdGFydCA9IG51bGw7XG4gICAgICAgICAgICAgICAgbG9jay50YXJnZXRFbGVtZW50Lm9udG91Y2htb3ZlID0gbnVsbDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAodGhpcy5kb2N1bWVudExpc3RlbmVyQWRkZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBQYXNzaXZlIGFyZ3VtZW50IHJlbW92ZWQgYmVjYXVzZSBFdmVudExpc3RlbmVyT3B0aW9ucyBkb2Vzbid0IGNvbnRhaW4gcGFzc2l2ZSBwcm9wZXJ0eS5cbiAgICAgICAgICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCB0aGlzLlByZXZlbnREZWZhdWx0LmJpbmQodGhpcykpO1xuICAgICAgICAgICAgICAgIHRoaXMuZG9jdW1lbnRMaXN0ZW5lckFkZGVkID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBSZXNldCBpbml0aWFsIGNsaWVudFkuXG4gICAgICAgICAgICB0aGlzLmluaXRpYWxDbGllbnRZID0gLTE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLlJlc3RvcmVPdmVyZmxvd1NldHRpbmcoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMubG9ja3MgPSBbXTtcbiAgICB9XG5cbiAgICBwdWJsaWMgRW5hYmxlQm9keVNjcm9sbCh0YXJnZXRFbGVtZW50OiBhbnkpOiB2b2lkIHtcbiAgICAgICAgaWYgKCF0YXJnZXRFbGVtZW50KSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignZW5hYmxlQm9keVNjcm9sbCB1bnN1Y2Nlc3NmdWwgLSB0YXJnZXRFbGVtZW50IG11c3QgYmUgcHJvdmlkZWQgd2hlbiBjYWxsaW5nIGVuYWJsZUJvZHlTY3JvbGwgb24gSU9TIGRldmljZXMuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmxvY2tzID0gdGhpcy5sb2Nrcy5maWx0ZXIobG9jayA9PiBsb2NrLnRhcmdldEVsZW1lbnQgIT09IHRhcmdldEVsZW1lbnQpO1xuXG4gICAgICAgIGlmICh0aGlzLmlzSW9zRGV2aWNlKSB7XG4gICAgICAgICAgICB0YXJnZXRFbGVtZW50Lm9udG91Y2hzdGFydCA9IG51bGw7XG4gICAgICAgICAgICB0YXJnZXRFbGVtZW50Lm9udG91Y2htb3ZlID0gbnVsbDtcblxuICAgICAgICAgICAgaWYgKHRoaXMuZG9jdW1lbnRMaXN0ZW5lckFkZGVkICYmIHRoaXMubG9ja3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgdGhpcy5QcmV2ZW50RGVmYXVsdC5iaW5kKHRoaXMpKTtcbiAgICAgICAgICAgICAgICB0aGlzLmRvY3VtZW50TGlzdGVuZXJBZGRlZCA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKCF0aGlzLmxvY2tzLmxlbmd0aCkge1xuICAgICAgICAgICAgdGhpcy5SZXN0b3JlT3ZlcmZsb3dTZXR0aW5nKCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIFJlc3RvcmVPdmVyZmxvd1NldHRpbmcoKTogdm9pZCB7XG4gICAgICAgIGlmICh0aGlzLnByZXZpb3VzQm9keVBhZGRpbmdSaWdodCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLnJlbmRlcmVyLnNldFN0eWxlKGRvY3VtZW50LmJvZHksICdwYWRkaW5nLXJpZ2h0JywgdGhpcy5wcmV2aW91c0JvZHlQYWRkaW5nUmlnaHQpO1xuXG4gICAgICAgICAgICAvLyBSZXN0b3JlIHByZXZpb3VzQm9keVBhZGRpbmdSaWdodCB0byB1bmRlZmluZWQgc28gc2V0T3ZlcmZsb3dIaWRkZW4ga25vd3MgaXRcbiAgICAgICAgICAgIC8vIGNhbiBiZSBzZXQgYWdhaW4uXG4gICAgICAgICAgICB0aGlzLnByZXZpb3VzQm9keVBhZGRpbmdSaWdodCA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLnByZXZpb3VzQm9keU92ZXJmbG93U2V0dGluZyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aGlzLnJlbmRlcmVyLnNldFN0eWxlKGRvY3VtZW50LmJvZHksICdvdmVyZmxvdycsIHRoaXMucHJldmlvdXNCb2R5T3ZlcmZsb3dTZXR0aW5nKTtcblxuICAgICAgICAgICAgLy8gUmVzdG9yZSBwcmV2aW91c0JvZHlPdmVyZmxvd1NldHRpbmcgdG8gdW5kZWZpbmVkXG4gICAgICAgICAgICAvLyBzbyBzZXRPdmVyZmxvd0hpZGRlbiBrbm93cyBpdCBjYW4gYmUgc2V0IGFnYWluLlxuICAgICAgICAgICAgdGhpcy5wcmV2aW91c0JvZHlPdmVyZmxvd1NldHRpbmcgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIFNldE92ZXJmbG93SGlkZGVuKG9wdGlvbnM/OiBCb2R5U2Nyb2xsT3B0aW9ucyk6IHZvaWQge1xuICAgICAgICAvLyBJZiBwcmV2aW91c0JvZHlQYWRkaW5nUmlnaHQgaXMgYWxyZWFkeSBzZXQsIGRvbid0IHNldCBpdCBhZ2Fpbi5cbiAgICAgICAgaWYgKHRoaXMucHJldmlvdXNCb2R5UGFkZGluZ1JpZ2h0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IHJlc2VydmVTY3JvbGxCYXJHYXAgPSAhIW9wdGlvbnMgJiYgb3B0aW9ucy5yZXNlcnZlU2Nyb2xsQmFyR2FwID09PSB0cnVlO1xuICAgICAgICAgICAgY29uc3Qgc2Nyb2xsQmFyR2FwID0gd2luZG93LmlubmVyV2lkdGggLSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGg7XG5cbiAgICAgICAgICAgIGlmIChyZXNlcnZlU2Nyb2xsQmFyR2FwICYmIHNjcm9sbEJhckdhcCA+IDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLnByZXZpb3VzQm9keVBhZGRpbmdSaWdodCA9IGRvY3VtZW50LmJvZHkuc3R5bGUucGFkZGluZ1JpZ2h0O1xuICAgICAgICAgICAgICAgIHRoaXMucmVuZGVyZXIuc2V0U3R5bGUoZG9jdW1lbnQuYm9keSwgJ3BhZGRpbmctcmlnaHQnLCBgJHtzY3JvbGxCYXJHYXB9cHhgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICAvLyBJZiBwcmV2aW91c0JvZHlPdmVyZmxvd1NldHRpbmcgaXMgYWxyZWFkeSBzZXQsIGRvbid0IHNldCBpdCBhZ2Fpbi5cbiAgICAgICAgaWYgKHRoaXMucHJldmlvdXNCb2R5T3ZlcmZsb3dTZXR0aW5nID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRoaXMucHJldmlvdXNCb2R5T3ZlcmZsb3dTZXR0aW5nID0gZG9jdW1lbnQuYm9keS5zdHlsZS5vdmVyZmxvdztcbiAgICAgICAgICAgIHRoaXMucmVuZGVyZXIuc2V0U3R5bGUoZG9jdW1lbnQuYm9keSwgJ292ZXJmbG93JywgJ2hpZGRlbicpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBQcmV2ZW50RGVmYXVsdChyYXdFdmVudDogSGFuZGxlU2Nyb2xsRXZlbnQpOiBib29sZWFuIHtcbiAgICAgICAgY29uc3QgZSA9IHJhd0V2ZW50IHx8IHdpbmRvdy5ldmVudDtcblxuICAgICAgICAvLyBGb3IgdGhlIGNhc2Ugd2hlcmVieSBjb25zdW1lcnMgYWRkcyBhIHRvdWNobW92ZSBldmVudCBsaXN0ZW5lciB0byBkb2N1bWVudC5cbiAgICAgICAgLy8gUmVjYWxsIHRoYXQgd2UgZG8gZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgcHJldmVudERlZmF1bHQsIHsgcGFzc2l2ZTogZmFsc2UgfSlcbiAgICAgICAgLy8gaW4gZGlzYWJsZUJvZHlTY3JvbGwgLSBzbyBpZiB3ZSBwcm92aWRlIHRoaXMgb3Bwb3J0dW5pdHkgdG8gYWxsb3dUb3VjaE1vdmUsIHRoZW5cbiAgICAgICAgLy8gdGhlIHRvdWNobW92ZSBldmVudCBvbiBkb2N1bWVudCB3aWxsIGJyZWFrLlxuICAgICAgICBpZiAodGhpcy5BbGxvd1RvdWNoTW92ZShlLnRhcmdldCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIC8vIERvIG5vdCBwcmV2ZW50IGlmIHRoZSBldmVudCBoYXMgbW9yZSB0aGFuIG9uZSB0b3VjaCAodXN1YWxseSBtZWFuaW5nIHRoaXMgaXMgYSBtdWx0aSB0b3VjaCBnZXN0dXJlIGxpa2UgcGluY2ggdG8gem9vbSkuXG4gICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgaWYgKGUudG91Y2hlcy5sZW5ndGggPiAxKSB7IHJldHVybiB0cnVlOyB9XG5cbiAgICAgICAgaWYgKGUucHJldmVudERlZmF1bHQpIHsgZS5wcmV2ZW50RGVmYXVsdCgpOyB9XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHByaXZhdGUgSGFuZGxlU2Nyb2xsKGV2ZW50OiBIYW5kbGVTY3JvbGxFdmVudCwgdGFyZ2V0RWxlbWVudDogYW55KTogYW55XG4gICAge1xuICAgICAgICBjb25zdCBjbGllbnRZID0gZXZlbnQudGFyZ2V0VG91Y2hlc1swXS5jbGllbnRZIC0gdGhpcy5pbml0aWFsQ2xpZW50WTtcblxuICAgICAgICBpZiAodGhpcy5BbGxvd1RvdWNoTW92ZShldmVudC50YXJnZXQpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGFyZ2V0RWxlbWVudCAmJiB0YXJnZXRFbGVtZW50LnNjcm9sbFRvcCA9PT0gMCAmJiBjbGllbnRZID4gMCkge1xuICAgICAgICAgICAgLy8gZWxlbWVudCBpcyBhdCB0aGUgdG9wIG9mIGl0cyBzY3JvbGwuXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5QcmV2ZW50RGVmYXVsdChldmVudCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5pc1RhcmdldEVsZW1lbnRUb3RhbGx5U2Nyb2xsZWQodGFyZ2V0RWxlbWVudCkgJiYgY2xpZW50WSA8IDApIHtcbiAgICAgICAgICAgIC8vIGVsZW1lbnQgaXMgYXQgdGhlIGJvdHRvbSBvZiBpdHMgc2Nyb2xsLlxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuUHJldmVudERlZmF1bHQoZXZlbnQpO1xuICAgICAgICB9XG5cbiAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHByaXZhdGUgaXNUYXJnZXRFbGVtZW50VG90YWxseVNjcm9sbGVkKHRhcmdldEVsZW1lbnQ6IGFueSk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gdGFyZ2V0RWxlbWVudCA/IHRhcmdldEVsZW1lbnQuc2Nyb2xsSGVpZ2h0IC0gdGFyZ2V0RWxlbWVudC5zY3JvbGxUb3AgPD0gdGFyZ2V0RWxlbWVudC5jbGllbnRIZWlnaHQgOiBmYWxzZTtcbiAgICB9XG4gICAgcHJpdmF0ZSBBbGxvd1RvdWNoTW92ZShlbDogRXZlbnRUYXJnZXQpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubG9ja3Muc29tZShsb2NrID0+IHtcbiAgICAgICAgICAgIHJldHVybiBsb2NrLm9wdGlvbnMuYWxsb3dUb3VjaE1vdmUgJiYgbG9jay5vcHRpb25zLmFsbG93VG91Y2hNb3ZlKGVsKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBDaGVja0lmSXNJb3NEZXZpY2UoKTogdm9pZFxuICAgIHtcbiAgICAgICAgdGhpcy5pc0lvc0RldmljZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICAgICAgICB3aW5kb3cubmF2aWdhdG9yICYmXG4gICAgICAgICAgICB3aW5kb3cubmF2aWdhdG9yLnBsYXRmb3JtICYmXG4gICAgICAgICAgICAoL2lQKGFkfGhvbmV8b2QpLy50ZXN0KHdpbmRvdy5uYXZpZ2F0b3IucGxhdGZvcm0pIHx8XG4gICAgICAgICAgICAgICAgKHdpbmRvdy5uYXZpZ2F0b3IucGxhdGZvcm0gPT09ICdNYWNJbnRlbCcgJiYgd2luZG93Lm5hdmlnYXRvci5tYXhUb3VjaFBvaW50cyA+IDEpKTtcbiAgICB9XG5cbiAgICBwcml2YXRlIFRlc3RQYXNzaXZlKCk6IHZvaWRcbiAgICB7XG4gICAgICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJylcbiAgICAgICAge1xuICAgICAgICAgICAgY29uc3QgcGFzc2l2ZVRlc3RPcHRpb25zID1cbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBnZXQgcGFzc2l2ZSgpXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmhhc1Bhc3NpdmVFdmVudHMgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigndGVzdFBhc3NpdmUnLCBudWxsLCBwYXNzaXZlVGVzdE9wdGlvbnMpO1xuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZVxuICAgICAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Rlc3RQYXNzaXZlJywgbnVsbCwgcGFzc2l2ZVRlc3RPcHRpb25zKTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiJdfQ==