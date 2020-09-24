import {Injectable, NgZone, Renderer2, RendererFactory2} from '@angular/core';
import {fromEvent, Observable, Subscription} from 'rxjs';

export interface BodyScrollOptions
{
    reserveScrollBarGap?: boolean;
    allowTouchMove?: (el: any) => boolean;
}

interface Lock
{
    targetElement: any;
    options: BodyScrollOptions;
    subscriptions: Subscription[];
}

type HandleScrollEvent = TouchEvent;

function outsideZone<T>(zone: NgZone) {
    return (source: Observable<T>) => {
        return new Observable(observer => {
            let sub: Subscription;

            zone.runOutsideAngular(() => {
                sub = source.subscribe(observer);
            });

            return sub;
        });
    };
}

@Injectable()
export class NgBodyScrollLockService
{
    private renderer: Renderer2;

    private hasPassiveEvents = false;
    private isIosDevice: boolean;
    private initialClientY = -1;
    private locks: Lock[] = [];
    private documentListener?: Subscription;
    private previousBodyPaddingRight: string;
    private previousBodyOverflowSetting: string;

    constructor(rendererFactory: RendererFactory2, private ngZone: NgZone)
    {
        this.renderer = rendererFactory.createRenderer(null, null);

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
                subscriptions: []
            };

        if (this.isIosDevice) {
            let subscribe;

            subscribe = fromEvent(targetElement, 'touchstart',
                this.hasPassiveEvents ? { passive: false } : undefined)
                .pipe(outsideZone(this.ngZone))
                .subscribe((event: HandleScrollEvent) => {

                    if (event.targetTouches.length === 1) {
                        // detect single touch.
                        this.initialClientY = event.targetTouches[0].clientY;
                    }
                });
            lock.subscriptions.push(subscribe);

            subscribe = fromEvent(targetElement, 'touchmove',
                this.hasPassiveEvents ? { passive: false } : undefined)
                .pipe(outsideZone(this.ngZone))
                .subscribe((event: HandleScrollEvent) => {

                    if (event.targetTouches.length === 1) {
                        // detect single touch.
                        this.HandleScroll(event, targetElement);
                    }
                });
            lock.subscriptions.push(subscribe);

            if (!this.documentListener) {
                this.documentListener = fromEvent(document, 'touchmove',
                    this.hasPassiveEvents ? { passive: false } : undefined)
                    .pipe(outsideZone(this.ngZone))
                    .subscribe(this.PreventDefault.bind(this));
            }
        }

        this.locks.push(lock);

        if (!this.isIosDevice) {
            this.SetOverflowHidden(options);
        }
    }

    public ClearAllBodyScrollLocks(): void {
        if (this.isIosDevice) {
            // Clear all locks ontouchstart/ontouchmove handlers, and the references.
            this.locks.forEach((lock: Lock) => {
                lock.subscriptions.forEach((s: Subscription) => s.unsubscribe());
            });

            if (this.documentListener) {
                // Passive argument removed because EventListenerOptions doesn't contain passive property.
                this.documentListener.unsubscribe();
                this.documentListener = undefined;
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

        this.locks = this.locks.filter(lock => {
            if (lock.targetElement === targetElement) {
                lock.subscriptions.forEach((s: Subscription) => s.unsubscribe());
                return false;
            } else { return true; }
        });

        if (this.isIosDevice && this.documentListener && this.locks.length === 0) {
            this.documentListener.unsubscribe();
            this.documentListener = undefined;

        } else if (!this.locks.length) {
            this.RestoreOverflowSetting();
        }
    }

    private RestoreOverflowSetting(): void {
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

    private SetOverflowHidden(options?: BodyScrollOptions): void {
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

            this.ngZone.runOutsideAngular(() => {
                window.addEventListener('testPassive', null, passiveTestOptions);
                // @ts-ignore
                window.removeEventListener('testPassive', null, passiveTestOptions);
            });
        }
    }
}
