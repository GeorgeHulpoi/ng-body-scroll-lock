import { NgZone, RendererFactory2 } from '@angular/core';
export interface BodyScrollOptions {
    reserveScrollBarGap?: boolean;
    allowTouchMove?: (el: any) => boolean;
}
export declare class NgBodyScrollLockService {
    private ngZone;
    private renderer;
    private hasPassiveEvents;
    private isIosDevice;
    private initialClientY;
    private locks;
    private documentListener?;
    private previousBodyPaddingRight;
    private previousBodyOverflowSetting;
    constructor(rendererFactory: RendererFactory2, ngZone: NgZone);
    DisableBodyScroll(targetElement: any, options?: BodyScrollOptions): void;
    ClearAllBodyScrollLocks(): void;
    EnableBodyScroll(targetElement: any): void;
    private RestoreOverflowSetting;
    private SetOverflowHidden;
    private PreventDefault;
    private HandleScroll;
    private isTargetElementTotallyScrolled;
    private AllowTouchMove;
    private CheckIfIsIosDevice;
    private TestPassive;
}
