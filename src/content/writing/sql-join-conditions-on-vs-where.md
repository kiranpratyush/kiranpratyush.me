---
title: "SQL JOIN: Condition in ON vs. WHERE"
description: "How conditions in ON and WHERE behave differently with inner and outer joins."
publishedAt: 2026-09-04
tags:
  - SQL
  - Databases
draft: false
---

SQL allows putting a condition inside the `ON` clause that is not directly part of matching two tables.

While this looks similar to putting the same condition in the `WHERE` clause, both have some important nuances.

Let's understand this with a simple example.

Suppose we have two tables:

`customers`

| id | customer_name |
|---:|---------------|
| 1  | Ralph         |
| 2  | Pratyush      |
| 3  | Kiran         |

`orders`

| id | customer_id | status     |
|---:|------------:|------------|
| 1  | 1           | pending    |
| 2  | 1           | dispatched |
| 3  | 2           | cancelled  |
| 4  | 2           | pending    |

Let's say we want customers along with their pending orders.

First, let's try it with an `INNER JOIN`.

We can put the condition inside the `ON` clause:

```sql
SELECT c.id, c.customer_name, o.status
FROM customers c
INNER JOIN orders o
    ON c.id = o.customer_id
    AND o.status = 'pending';
```

Or we can put the same condition in the `WHERE` clause:

```sql
SELECT c.id, c.customer_name, o.status
FROM customers c
INNER JOIN orders o
    ON c.id = o.customer_id
WHERE o.status = 'pending';
```

Both queries give us the same result:

| id | customer_name | status  |
|---:|---------------|---------|
| 1  | Ralph         | pending |
| 2  | Pratyush      | pending |

With an inner join, only rows satisfying the required conditions survive in the final result. So, in this case, moving `o.status = 'pending'` between `ON` and `WHERE` doesn't change the result.

But now let's move to an outer join.

Consider a `LEFT JOIN` with the condition inside `ON`:

```sql
SELECT c.id, c.customer_name, o.status
FROM customers c
LEFT JOIN orders o
    ON c.id = o.customer_id
    AND o.status = 'pending';
```

Here, `o.status = 'pending'` decides which rows from `orders` are allowed to match.

But since this is a `LEFT JOIN`, all rows from `customers` are preserved even when there is no matching pending order.

So we get:

| id | customer_name | status  |
|---:|---------------|---------|
| 1  | Ralph         | pending |
| 2  | Pratyush      | pending |
| 3  | Kiran         | `NULL`  |

Now let's move the same condition to `WHERE`:

```sql
SELECT c.id, c.customer_name, o.status
FROM customers c
LEFT JOIN orders o
    ON c.id = o.customer_id
WHERE o.status = 'pending';
```

The left join first logically produces rows like:

| id | customer_name | status     |
|---:|---------------|------------|
| 1  | Ralph         | pending    |
| 1  | Ralph         | dispatched |
| 2  | Pratyush      | cancelled  |
| 2  | Pratyush      | pending    |
| 3  | Kiran         | `NULL`     |

Then:

```sql
WHERE o.status = 'pending'
```

filters those rows.

For Kiran, `o.status` is `NULL`, and:

```text
NULL = 'pending'
```

evaluates to `UNKNOWN`, not `TRUE`.

So Kiran is removed, and the final result becomes:

| id | customer_name | status  |
|---:|---------------|---------|
| 1  | Ralph         | pending |
| 2  | Pratyush      | pending |

With an inner join, moving this kind of condition between `ON` and `WHERE` can produce the same result. With an outer join, they can mean different things. With a left join, for example, a condition in `ON` controls which right-side rows are allowed to match; left-side rows are still preserved. A condition in `WHERE` filters the result after the join, so null extended rows can disappear.
