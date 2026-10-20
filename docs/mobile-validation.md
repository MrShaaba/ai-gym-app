# Mobile validation — pending

This is a future acceptance checklist. No item below represents a completed native-device test. Browser layout checks do not certify Expo native behavior. Native screens still need the corresponding domain and reliability changes from this iteration.

| Gate | iOS | Android | Evidence required |
| --- | --- | --- | --- |
| Align Expo dependencies and generate development builds | Pending | Pending | Compatibility checks/build logs |
| Port web lifecycle contract to native screens/adapters | Pending | Pending | Contract/regression tests |
| Register, verify, recover, sign in/out, switch accounts | Pending | Pending | Auth-state assertions/device traces |
| Decimal kg/lb entry, text scaling, keyboard dismissal | Pending | Pending | Physical-device recordings |
| Pause/resume, background, lock, interrupted sessions | Pending | Pending | Timer/draft recovery |
| Process death offline; complete/reconnect/replay once | Pending | Pending | Server records and outbox state |
| Recurrence, template changes and historical integrity | Pending | Pending | Before/after data |
| Coach accept/revoke and access removal | Pending | Pending | Two-account/device test |
| VoiceOver/TalkBack, safe areas and touch targets | Pending | Pending | Accessibility review |
| Face ID/device authentication and secure storage | Pending | Pending | Real-device checks |
| Hosted AI validation, quotas and failure recovery | Pending | Pending | Provider/server logs |
| Purchase, restore, expiry/refund and webhook retries | Pending | Pending | Sandbox receipts/entitlements |
| Push permission, background delivery and deep links | Pending | Pending | Delivery/navigation tests |
| Export, deletion and retention policy | Pending | Pending | Privacy workflow test |
| Signing, store metadata, support and privacy details | Pending | Pending | Store submission review |

Use provider sandboxes and staging when this phase begins. Do not present placeholders as passed checks or enabled capabilities.
