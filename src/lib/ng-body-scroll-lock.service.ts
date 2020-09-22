import { Injectable } from '@angular/core';

export interface BodyScrollOptions
{
    reserveScrollBarGap?: boolean;
    allowTouchMove?: (el: any) => boolean;
}

interface Lock
{
    targetElement: any;
    options: BodyScrollOptions;
}

type HandleScrollEvent = TouchEvent;

@Injectable()
export class NgBodyScrollLockService
{
    private hasPassiveEvents = false;
    private isIosDevice: boolean;
    private initialClientY = -1;
    private locks: Lock[] = [];
    private documentListenerAdded = false;
    private previousBodyPaddingRight: string;
    private previousBodyOverflowSetting: string;

    constructor()
    {
        this.TestPassive();
        this.CheckIfIsIosDevice();
    }

    public DisableBodyScroll(targetElement: any, options?: BodyScrollOptions): void {
        // targetElement must be provided
        if (!targetElement) {
            // eslint-disable-next-line no-console
            console.error('disableBodyScroll unsuccessful - targetElement must be provided when calling disableBodyScroll on IOS devices.');
            return;
        }

        // disableBodyScroll must not have been called on this targetElement before
        // tslint:disable-next-line:no-shadowed-variable
        if (this.locks.some((lock: Lock) => lock.targetElement === targetElement)) {
            return;
        }

        const lock =
        {
            targetElement,
            options: options || {},
        };

        this.locks = [...this.locks, lock];

        if (this.isIosDevice) {
            targetElement.ontouchstart = (event: HandleScrollEvent) => {
                if (event.targetTouches.length === 1) {
                    // detect single touch.
                    this.initialClientY = event.targetTouches[0].clientY;
                }
            };

            targetElement.ontouchmove = (event: HandleScrollEvent) => {
                if (event.targetTouches.length === 1) {
                    // detect single touch.
                    this.HandleScroll(event, targetElement);
                }
            };

            if (!this.documentListenerAdded) {
                document.addEventListener('touchmove', this.PreventDefault.bind(this),
                    this.hasPassiveEvents ? { passive: false } : undefined);
                this.documentListenerAdded = true;
            }
        } else {
            this.SetOverflowHidden(options);
        }
    }

    public ClearAllBodyScrollLocks(): void {
        if (this.isIosDevice) {
            // Clear all locks ontouchstart/ontouchmove handlers, and the references.
            this.locks.forEach((lock: Lock) => {
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
        } else {
            this.RestoreOverflowSetting();
        }

        this.locks = [];
    }

    public EnableBodyScroll(targetElement: any): void {
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
        } else if (!this.locks.length) {
            this.RestoreOverflowSetting();
        }
    }

    private RestoreOverflowSetting(): void {
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
    }

    private SetOverflowHidden(options?: BodyScrollOptions): void {
        // If previousBodyPaddingRight is already set, don't set it again.
        if (this.previousBodyPaddingRight === undefined) {
            const reserveScrollBarGap = !!options && options.reserveScrollBarGap === true;
            const scrollBarGap = window.innerWidth - document.documentElement.clientWidth;

            if (reserveScrollBarGap && scrollBarGap > 0) {
                this.previousBodyPaddingRight = document.body.style.paddingRight;
                document.body.style.paddingRight = `${scrollBarGap}px`;
            }
        }
        // If previousBodyOverflowSetting is already set, don't set it again.
        if (this.previousBodyOverflowSetting === undefined) {
            this.previousBodyOverflowSetting = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
        }
    }

    private PreventDefault(rawEvent: HandleScrollEvent): boolean {
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
        if (e.touches.length > 1) { return true; }

        if (e.preventDefault) { e.preventDefault(); }

        return false;
    }

    private HandleScroll(event: HandleScrollEvent, targetElement: any): any
    {
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

    private isTargetElementTotallyScrolled(targetElement: any): boolean {
        return targetElement ? targetElement.scrollHeight - targetElement.scrollTop <= targetElement.clientHeight : false;
    }
    private AllowTouchMove(el: EventTarget): boolean {
        return this.locks.some(lock => {
            return lock.options.allowTouchMove && lock.options.allowTouchMove(el);
        });
    }

    private CheckIfIsIosDevice(): void
    {
        this.isIosDevice = typeof window !== 'undefined' &&
            window.navigator &&
            window.navigator.platform &&
            (/iP(ad|hone|od)/.test(window.navigator.platform) ||
                (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1));
    }

    private TestPassive(): void
    {
        if (typeof window !== 'undefined')
        {
            const passiveTestOptions =
            {
                get passive()
                {
                    this.hasPassiveEvents = true;
                    return undefined;
                }
            };
            window.addEventListener('testPassive', null, passiveTestOptions);
            // @ts-ignore
            window.removeEventListener('testPassive', null, passiveTestOptions);
        }
    }
}
