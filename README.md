# Angular Body Scroll Lock

This is an Angular library that implements the [body-scroll-lock](https://github.com/willmcpo/body-scroll-lock), which can have minor problems in an Angular Project. The **Angular Body Scroll Lock** purpose is to optimize and implements Angular features, but without changing the original script logic. Every change on the **body-scroll-lock** package will be synchronized in this project too.

## Install

```bash
$ yarn add ng-body-scroll-lock

or

$ npm install ng-body-scroll-lock
```

## Usage

### Import Module/Service in your Module

Import the **NgBodyScrollLockModule** in your module or import **NgBodyScrollLockService** in your providers.
#### !!! Be aware that on some Angular versions it would not work importing the **NgBodyScrollLockModule**, in that case, you have to import the **NgBodyScrollLockService** in providers!

##### Example with module
```typescript
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgBodyScrollLockModule } from 'ng-body-scroll-lock';

import { NavigationBarComponent } from './navigation-bar.component';
import { HamburgerIconComponent } from './hamburger-icon/hamburger-icon.component';

@NgModule({
	imports:
	[
		CommonModule,
		RouterModule,
		NgBodyScrollLockModule
	],
	declarations:
	[
		NavigationBarComponent,
		HamburgerIconComponent
	],
	exports:
	[
		NavigationBarComponent
	]
})
export class NavigationBarModule { }
```
##### Example with service
```typescript
typescript
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgBodyScrollLockService } from 'ng-body-scroll-lock';

import { NavigationBarComponent } from './navigation-bar.component';
import { HamburgerIconComponent } from './hamburger-icon/hamburger-icon.component';

@NgModule({
	imports:
	[
		CommonModule,
		RouterModule
	],
	declarations:
	[
		NavigationBarComponent,
		HamburgerIconComponent
	],
	exports:
	[
		NavigationBarComponent
	],
    providers: 
    [
        NgBodyScrollLockService
    ]
})
export class NavigationBarModule { }
```

### Import Service to use Body Scroll Lock

Import the **NgBodyScrollLockService** where you want to use it

##### Example

```typescript 
import { Component, ViewChild, ElementRef } from '@angular/core';
import { NgBodyScrollLockService } from 'ng-body-scroll-lock';

@Component
({
	selector: 'navigation-bar',
	templateUrl: './navigation-bar-component.html',
	styleUrls: ['./navigation-bar-component.scss']
})
export class NavigationBarComponent {

	@ViewChild('verticalMenu', {static: true}) VerticalMenuRef: ElementRef;
    public isVerticalMenuOpen: boolean = false;

	constructor(private bodyScrollLock: NgBodyScrollLockService) {}

    public openVerticalMenu() {
        this.isVerticalMenuOpen = true;
        this.bodyScrollLock.DisableBodyScroll(this.VerticalMenuRef.nativeElement);
    }

    public closeVerticalMenu() {
        this.isVerticalMenuOpen = false;
        this.bodyScrollLock.EnableBodyScroll(this.VerticalMenuRef.nativeElement);
    }
}
```

## Functions

| Function                  | Arguments                                                  | Return | Description                                                  |
| :------------------------ | :--------------------------------------------------------- | :----: | :----------------------------------------------------------- |
| `DisableBodyScroll`       | `targetElement: HTMLElement`, `options: BodyScrollOptions` | `void` | Disables body scroll while enabling scroll on target element |
| `EnableBodyScroll`        | `targetElement: HTMLElement`                               | `void` | Enables body scroll and removing listeners on target element |
| `ClearAllBodyScrollLocks` | `null`                                                     | `void` | Clears all scroll locks                                      |
