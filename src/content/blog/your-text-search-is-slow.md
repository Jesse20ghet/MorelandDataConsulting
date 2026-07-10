---
title: "Your text search is slow"
description: "You're using a wildcard and now SQL isn't using your index"
pubDate: 2026-07-10
draft: false
---

![Test Image](/images/test-image.png)

You didn't deploy anything. No one changed the query. The data didn't balloon overnight. And yet this morning, a stored procedure that used to run in 200 milliseconds is taking eight seconds, and it's dragging everything behind it.

This is one of the most common calls I get, and the cause is usually the same: **the execution plan changed**, and not in your favor.

## What actually happened

SQL Server decides *how* to run a query — which indexes to use, which join strategy, how much memory to grant — based on statistics about your data. When those statistics update (which SQL Server does automatically as data changes), it throws out the cached plan and builds a new one the next time the query runs.

Most of the time, the new plan is fine. Occasionally, SQL Server picks a plan optimized for the wrong shape of data — a classic example being **parameter sniffing**, where the plan gets built for a parameter value that isn't representative of typical use. The query that got compiled for "find one customer" suddenly gets reused for "find every customer in California," and the plan that was perfect for the first case is a disaster for the second.

## How to confirm it in a few minutes

Before changing anything, verify that's what you're looking at:

- Pull the current execution plan for the slow query and compare it to what it *should* look like. A plan doing a scan where it used to do a seek is a strong tell.
- Check when statistics last updated on the tables involved. If it lines up with when things got slow, that's your smoking gun.
- Look at whether the query is sensitive to which parameter value compiled it — running it with different parameters and watching the plan tells you a lot.

## The fix depends on the cause

Once you've confirmed it, the options range from targeted to blunt:

- Update statistics so SQL Server has a current picture of the data.
- For parameter sniffing specifically, there are several approaches — `OPTIMIZE FOR`, recompile hints, or restructuring the query — each with tradeoffs depending on how the query is actually used.
- Sometimes the right answer is a better index that makes the plan choice matter less.

The wrong move is to blindly clear the plan cache and hope — that might fix it for an hour until the same bad plan gets picked again.

---

If this sounds like what's happening on your server and you'd rather not chase it alone, [tell me what's going on](/#contact) — this is squarely the kind of thing I help with.
