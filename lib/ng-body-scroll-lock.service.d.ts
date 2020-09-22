export interface BodyScrollOptions {
    reserveScrollBarGap?: boolean;
    allowTouchMove?: (el: any) => boolean;
}
export declare class NgBodyScrollLockService {
    private platformId;
    private hasPassiveEvents;
    private isIosDevice;
    private initialClientY;
    private locks;
    private documentListenerAdded;
    private previousBodyPaddingRight;
    private previousBodyOverflowSetting;
    constructor(platformId: any);
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
