import { animate, query, stagger, style, transition, trigger } from '@angular/animations'

export const listAnimation = trigger('listAnimation', [
  transition('* <=> *', [
    query(':enter', [style({ opacity: 0 }), stagger('60ms', animate('300ms ease-out', style({ opacity: 1 })))], {
      optional: true
    }),
    query(':leave', animate('100ms', style({ opacity: 0 })), { optional: true })
  ])
])

export const listEnterAnimation = trigger('listEnterAnimation', [
  transition('* <=> *', [
    query(':enter', [style({ opacity: 0 }), stagger('20ms', animate('100ms ease-out', style({ opacity: 1 })))], {
      optional: true
    })
  ])
])

export const ListHeightStaggerAnimation = trigger('listHeightStagger', [
  transition('* <=> *', [
    query(':enter', [
      style({ height: '0', opacity: 0 }),
      stagger('60ms', animate('200ms ease-out', style({ height: '*', opacity: 1 })))
    ]),
    query(':leave', [
      style({ height: '0', opacity: 0 })
    ], { optional: true })
  ])
])