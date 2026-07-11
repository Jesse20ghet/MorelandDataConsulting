---
title: "Your text search is slow"
description: "You're using a wildcard and now SQL isn't using your index"
pubDate: 2026-07-11
draft: false
---

Have you ever tried to index a text field but SQL server just won't use it? In this blog post, we're going to talk about how to solve that problem using a full text catalog.

## Setting the scene

I'm using StackOverflow 2013 database provided by Brent Ozar and the team at Stack Overflow. You can follow his blog post here to get it yourself: https://www.brentozar.com/archive/2015/10/how-to-download-the-stack-overflow-database-via-bittorrent/ and I want to be able to search for posts by title. Lets just say we want to just get the first 10 posts with a title that matches our query string.

Lets take a look at the Posts table

![Posts](/images/posts-table.png)

Along with various other fields, you can see that Posts has title field with a nullable nvarchar(250). Lets turn on Include Actual Execution Plan and run our query(Select *!?, please forgive me. This is just a demo!):
```
SELECT top 10 p.Title, * 
FROM Posts p 
WHERE p.Title like 'Sql Server%'
```
And we end up with a clustered index scan because the table only has one index, a clustered index on the Posts table.
![Clustered index scan](/images/posts-table-clustered-index.png)

This results in
<br> CPU Time: 0ms
<br>Query time: 49ms
<br>Logical reads: 1462

We can do better! Lets add an index to the posts table that covers this title column.
```
CREATE INDEX IX_Title 
ON Posts(Title)
```
And now lets run our query again

![Posts table query with lookups](/images/posts-table-query-with-lookups.png)

This results in
<br> CPU Time: 0ms
<br>Query time: 53ms
<br>Logical reads: 44

Yes this results in some key lookups that we could get rid of by including other fields in the index but we're no longer scanning the clustered index and logical reads are a fraction of what they were before!

But what if we change our query a bit? Lets include a wildcard at the start of our query text instead of just the end.
```
SELECT top 10 p.Title, * 
FROM Posts p 
WHERE p.Title like '%Sql Server%'
```

![Clustered Index Scan again](/images/clustered-index-scan-again.png)

Oh no! We're back to a clustered index scan. But we have a covering index don't we? Why isn't SQL Server choosing to use it? Stupid SQL Server. Lets force it!
```
SELECT top 10 p.Title, * 
FROM Posts p WITH(INDEX(IX_Title))
WHERE p.Title like '%Sql Server%'
```

![Forced Index](/images/forced-index.png)

This results in
<br> CPU Time: 1609ms
<br>Query time: 1685ms
<br>Logical reads: 14208

Wow. An index scan(not a seek like before). Maybe SQL Server knows what's its doing when it decides to scan the clustered index instead of the index. But why? Why is this not working? Well the answer is that when you have a wildcard at the start of your query, it stops SQL from being able to index seek directly to the node in the B-tree then read sequentially. 

Well you can think of your index like this. An ordered list starting with NULL then alphabetically ordered. And when its like this, SQL can seek to the `Sql Server` node in the index and read it. But when you have a wildcard at the beginning, `Sql Server` doesn't know where to start.
```
SELECT TOP 100 p.Title
FROM Posts p
WHERE p.Title IS NOT NULL -- Get results that are not null
ORDER BY p.Title
```

## Full Text Catalogs

The solution to this is a full text catalog. Full text catalogs let you search through all the text in a column quickly and the best thing about them, wildcards work!

First things first, run this to make sure you have this feature installed and it should result in a 1. If it doesn't you'll need to install that feature which is outside the scope of this blog post.
```
SELECT SERVERPROPERTY('IsFullTextInstalled');
```

Now lets create a full text catalog. This will create a container where your catalogs will live. Specifying `AS DEFAULT` makes it so that when you create full text indexes without specifying they catalog, they'll end up in here.
```
CREATE FULLTEXT CATALOG ftCatalog AS DEFAULT;
```

Now that we have a place to create the full text indexes, lets create one! The only gotcha here is that the table you're creating the full text index on needs to have a unique index.
```
CREATE FULLTEXT INDEX ON dbo.Posts (Title)
    KEY INDEX PK_Posts_Id   -- name of the unique index (PK)
    ON ftCatalog
    WITH CHANGE_TRACKING AUTO;    -- keeps index updated automatically
```

And now that your full text is created, we can query it! You just need to change the syntax a bit. Using the CONTAINS function tells SQL to use the full text index
```
SELECT top 10 p.Title, * 
FROM Posts p 
--WHERE p.Title like '%Sql Server%'
WHERE CONTAINS(p.Title, '"Sql Server"')
```

![Forced Index](/images/full-text-search-query-plan.png)

This results in
<br> CPU Time: 16ms
<br>Query time: 49ms
<br>Logical reads: 45

Now you're off and rolling! You've successfully created a text catalog and efficiently queried it! Congratulations!


## Working with me

If you found this blog post helpful and would like to work with me, [shoot me an email](/#contact)!
