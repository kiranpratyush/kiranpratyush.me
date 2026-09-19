---
title: "Table Partitioning in Relational Databases"
description: "How PostgreSQL partition pruning avoids scanning irrelevant data and changes a query's execution plan."
publishedAt: 2026-09-19
tags:
  - PostgreSQL
  - Databases
  - Performance
draft: false
---

Table partitioning lets us break a large logical table into multiple, smaller physical pieces. Each partition's heap and index files are stored separately on disk.

This can lead to faster query responses when most of the matching records live in a single partition. PostgreSQL uses the query's `WHERE` clause to prune partitions it knows cannot contain relevant rows.

To see this in action, I created two simple tables: `test2` and `test3`. Both use a custom enum type called `status`, whose possible values are `status1`, `status2`, `status3`, `status4`, and `status5`.

![The structures of test2 and test3 in psql. test3 is partitioned by test_status into five list partitions.](/images/writing/table-partitioning/table-structure.png)

The tables share the same columns, but `test3` is partitioned on `test_status`. It has one list partition for each possible status value.

Now let's select every row whose `test_status` is `status5` from both tables and compare the results with `EXPLAIN ANALYZE`:

```sql
EXPLAIN ANALYZE
SELECT * FROM test2 WHERE test_status = 'status5';

EXPLAIN ANALYZE
SELECT * FROM test3 WHERE test_status = 'status5';
```

![EXPLAIN ANALYZE output for the same status5 query on the normal and partitioned tables.](/images/writing/table-partitioning/explain-analyze.png)

Both queries use a sequential scan. The important difference is where that scan happens.

For `test2`, PostgreSQL scans the entire table and filters out rows with other statuses. For the partitioned `test3`, it scans only `test3_status5`. PostgreSQL prunes the other four partitions because the `WHERE` clause makes it clear they cannot contain matching rows.

That is the practical benefit of partition pruning: even when the chosen access method is still a sequential scan, PostgreSQL can limit that scan to the relevant physical partition instead of reading the whole logical table.

Hope this helps!
