# Performance Optimizations & Caching

SplitDude uses state-of-the-art caching patterns and data invalidations to ensure instant UI transitions and minimal network roundtrips.

---

## 1. React Query (TanStack Query) Caching

All data fetch operations in SplitDude are wrapped inside TanStack Query hooks. This guarantees that components share a centralized, memory-cached state.

### Cached Query Keys
* `['currentUser']`: The authenticated user's session profile.
* `['dashboardData']`: The financial summary (balances, suggested settlements, active groups count).
* `['friends', userId]`: List of the user's friends.
* `['groups', userId]`: List of all groups the user is a member of.
* `['groupDetail', groupId]`: Detailed group information, including its members list, settlements log, and expense history.

---

## 2. Dynamic Cache Invalidation Patterns

When a user mutates data (e.g., adds an expense, records a settlement, or joins a group), the memory cache must be invalidated immediately so the UI fetches fresh data.

We call `queryClient.invalidateQueries` on specific target keys:

```typescript
const queryClient = useQueryClient()

// After successfully adding/deleting an expense:
queryClient.invalidateQueries({ queryKey: ['groupDetail', groupId] })
queryClient.invalidateQueries({ queryKey: ['dashboardData'] })
```

This prevents stale UI displays when navigating between the Dashboard page and specific Group details.

---

## 3. Optimistic Updates & Transitions

To guarantee a responsive UX, SplitDude uses optimistic state transitions:

* **Real-time Name Autocomplete**: Autocomplete results when searching friends are performed 100% locally in-memory against the pre-fetched `['friends']` list query. This allows instant matching on every keypress without sending DB calls.
* **Loading Skeletons**: CSS-shimmer skeletons are rendered during background queries, minimizing layout shifts.
* **Framer Motion Hardware Acceleration**: GPU-accelerated motion cards are used for modals, tabs, and slide-in panels to keep transitions locked at a smooth 60fps.
